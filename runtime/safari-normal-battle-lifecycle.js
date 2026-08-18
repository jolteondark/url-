import { resolveCaptureFlow } from "./battle-capture-flow.js";
import { routeCaughtQueueToPartyStorage } from "./caught-queue-party-storage.js";
import { safariCarryoverPartyLimit } from "./mapless-carry-class-rules.js";
import { resolveDayBoardPlayableTurn } from "./mapless-day-board-playable-turn.js";
import { finishMaplessRun } from "./mapless-run-end-lifecycle.js";
import { RubyMT19937Random } from "./ruby-mt19937-random.js";
import { SAFARI_SPECIES_MASTERS } from "./safari-playable-data.js";
import { resolveSafariNormalWildOpponentResponse } from "./safari-normal-battle-round.js";

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new TypeError("runtime variables.mapless state is required");
  }
  return state;
}

function requestsSave(operations = []) {
  return operations.some((operation) => operation?.op === "request_save");
}

function browserCaptureSeed() {
  if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === "function") {
    const value = new Uint32Array(1);
    globalThis.crypto.getRandomValues(value);
    return value[0] & 0x7fffffff;
  }
  return Math.floor(Math.random() * 0x80000000) & 0x7fffffff;
}

export function materializeSafariCaptureRandomValues(seed) {
  const normalizedSeed = Number(seed) & 0x7fffffff;
  const rng = new RubyMT19937Random(normalizedSeed);
  return [rng.randInt(65536), rng.randInt(65536), rng.randInt(65536), rng.randInt(65536)];
}

function capturePresentation(battle, capture) {
  return {
    type: "capture",
    result: capture.result,
    numShakes: capture.numShakes ?? null,
    target: "foe",
    targetSpecies: battle.foe?.species ?? null,
    targetMaxHp: Number(battle.foe?.max_hp ?? 0),
  };
}

function baseTurnInput(state, index) {
  return {
    index,
    day: state.day,
    board_events: state.board_events,
    board_revealed: state.board_revealed,
    board_consumed: state.board_consumed,
    board_visited: state.board_visited,
    notice: state.notice,
    scene_is_self: true,
    scene_same: true,
    event_stage_active: true,
    pending_hatches: [],
  };
}

function finalizeCaughtNormalWild(runtime) {
  const state = stateOf(runtime);
  const battle = state.battle;
  const encounter = battle.encounter ?? {};
  const input = baseTurnInput(state, battle.board_index);
  input.wild = {
    can_battle: true,
    encounter: {
      species_id: encounter.species_id ?? battle.foe.species,
      level: encounter.level ?? battle.foe.level,
    },
    species_exists: true,
    species_name: encounter.species_name ?? battle.foe.species,
    outcome: 4,
    run_end_pending: false,
    old_consumed: false,
    game_temp_present: true,
  };

  const turn = resolveDayBoardPlayableTurn(input);
  state.board_events = turn.state.board_events;
  state.board_revealed = turn.state.board_revealed;
  state.board_consumed = turn.state.board_consumed;
  const completionOperations = [...turn.operations];

  battle.completed = true;
  battle.return_target = "day_board";
  battle.last_operations = [...(battle.last_operations ?? []), ...completionOperations];
  battle.presentation = [
    ...(battle.presentation ?? []),
    {
      type: "battle_result",
      decision: 4,
      captured: true,
      expGained: 0,
      reward: null,
      moneyGained: 0,
      returnTarget: "day_board",
    },
  ];
  state.last_operations = completionOperations;
  state.notice = `${encounter.species_name ?? battle.foe.species}を捕まえました。`;
  return completionOperations;
}

export function attemptSafariCapture(runtime, { captureRandomSeed = browserCaptureSeed(), randomValues = undefined } = {}) {
  const state = stateOf(runtime);
  const battle = state.battle;
  if (!battle || battle.completed || battle.kind !== "wild") {
    throw new Error("active wild battle is required");
  }
  if (battle.origin === "boundary_trial") {
    throw new Error("boundary battle must use the boundary owner");
  }

  const speciesMaster = SAFARI_SPECIES_MASTERS[battle.foe?.species];
  if (!speciesMaster) {
    throw new RangeError(`capture species is outside the Safari projection: ${battle.foe?.species}`);
  }

  const normalizedCaptureSeed = Number(captureRandomSeed) & 0x7fffffff;
  const captureRandomValues = randomValues === undefined
    ? materializeSafariCaptureRandomValues(normalizedCaptureSeed)
    : [...randomValues];
  const capture = resolveCaptureFlow({
    targetFainted: Number(battle.foe.hp) <= 0,
    trainerBattle: false,
    ball: "POKEBALL",
    decision: 4,
    gainExpForCapture: false,
    allFaintedAfterCapture: false,
    capture: {
      totalHp: battle.foe.max_hp,
      hp: Math.max(1, Number(battle.foe.hp)),
      catchRate: speciesMaster.catch_rate,
      status: battle.foe.status ?? "NONE",
      ball: "POKEBALL",
      unconditional: false,
      enableCriticalCaptures: false,
      randomValues: captureRandomValues,
    },
  });
  const captureEvent = capturePresentation(battle, capture);

  if (capture.result !== "caught") {
    const response = resolveSafariNormalWildOpponentResponse(runtime);
    const operations = [...capture.operations, ...(response.operations ?? [])];
    battle.last_operations = operations;
    state.last_operations = operations;
    if (!battle.completed) state.notice = "捕獲結果: " + capture.result;
    return {
      runtime,
      result: capture.result,
      operations,
      presentation: [captureEvent, ...(response.presentation ?? [])],
      calculation: capture.capture,
      captureRandomSeed: normalizedCaptureSeed,
      randomValues: captureRandomValues,
      opponentResponse: response,
      persistenceRequested: requestsSave(operations),
    };
  }

  const carryClass = state.mapless_carry_class ?? "general";
  const partyLimit = safariCarryoverPartyLimit(carryClass);
  const routed = routeCaughtQueueToPartyStorage({
    party: runtime.player.party,
    boxes: runtime.storage_system.boxes,
    currentBox: runtime.storage_system.currentBox,
  }, [battle.foe], { maxPartySize: partyLimit });
  runtime.player.party = routed.state.party;
  runtime.storage_system.boxes = routed.state.boxes;
  runtime.storage_system.currentBox = routed.state.currentBox;

  battle.captured = true;
  battle.capture_destination = routed.routed[0]?.result ?? "full";
  battle.decision = 4;
  battle.last_operations = [...capture.operations, ...routed.operations, {
    op: "carry_class_party_limit",
    carryClass,
    partyLimit,
  }];
  battle.presentation = [{
    ...captureEvent,
    destination: battle.capture_destination,
  }];
  finalizeCaughtNormalWild(runtime);

  return {
    runtime,
    result: "caught",
    destination: battle.capture_destination,
    operations: battle.last_operations,
    presentation: battle.presentation,
    calculation: capture.capture,
    captureRandomSeed: normalizedCaptureSeed,
    randomValues: captureRandomValues,
    carryClass,
    partyLimit,
    persistenceRequested: requestsSave(battle.last_operations),
  };
}

export function returnSafariToDayBoard(runtime) {
  const state = stateOf(runtime);
  const battle = state.battle;
  if (!battle?.completed) throw new Error("completed battle is required");
  if (battle.origin === "boundary_trial") {
    throw new Error("boundary battle must use the boundary owner");
  }

  const target = battle.return_target ?? "day_board";
  const summary = {
    decision: battle.decision,
    captured: Boolean(battle.captured),
    expGained: Number(battle.trainer_exp_gained ?? 0) + Number(battle.exp_gained ?? 0),
    reward: battle.reward ?? null,
    moneyGained: Number(battle.money_gained ?? 0),
    returnTarget: target,
  };

  const runEnd = target === "home" ? finishMaplessRun(runtime) : { finished: false, operations: [] };
  state.battle = null;
  state.location = target;
  state.notice = target === "village"
    ? "討伐を終えて村へ戻りました。"
    : target === "home"
      ? "手持ちが全滅したため、今回のランは終了しました。"
      : "Day Boardへ戻りました。";
  const returnOperation = {
    op: target === "village" ? "return_to_village" : target === "home" ? "return_to_home" : "return_to_day_board",
  };
  const operations = [...runEnd.operations, returnOperation];
  state.last_operations = operations;

  return {
    runtime,
    result: "returned",
    target,
    summary,
    operations,
    persistenceRequested: requestsSave(operations),
    runEnd,
  };
}
