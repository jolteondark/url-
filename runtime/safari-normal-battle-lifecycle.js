import { resolveCaptureFlow } from "./battle-capture-flow.js";
import { routeCaughtQueueToPartyStorage } from "./caught-queue-party-storage.js";
import { SAFARI_SPECIES_MASTERS } from "./safari-playable-data.js";
import { finalizeNormalBattle } from "./safari-normal-battle-finalize.js";

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

export function attemptSafariNormalCapture(runtime) {
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
      randomValues: [0, 0, 0, 0],
    },
  });

  if (capture.result !== "caught") {
    state.notice = "捕獲結果: " + capture.result;
    state.last_operations = [...capture.operations];
    return {
      runtime,
      result: capture.result,
      operations: capture.operations,
      presentation: [],
      calculation: capture.capture,
      persistenceRequested: requestsSave(capture.operations),
    };
  }

  const routed = routeCaughtQueueToPartyStorage({
    party: runtime.player.party,
    boxes: runtime.storage_system.boxes,
    currentBox: runtime.storage_system.currentBox,
  }, [battle.foe]);
  runtime.player.party = routed.state.party;
  runtime.storage_system.boxes = routed.state.boxes;
  runtime.storage_system.currentBox = routed.state.currentBox;

  battle.captured = true;
  battle.capture_destination = routed.routed[0]?.result ?? "full";
  battle.decision = 4;
  battle.last_operations = [...capture.operations, ...routed.operations];
  battle.presentation = [{
    type: "capture",
    result: "caught",
    destination: battle.capture_destination,
  }];
  finalizeNormalBattle(runtime);

  return {
    runtime,
    result: "caught",
    destination: battle.capture_destination,
    operations: battle.last_operations,
    presentation: battle.presentation,
    calculation: capture.capture,
    persistenceRequested: requestsSave(battle.last_operations),
  };
}

export function returnSafariNormalBattleToDayBoard(runtime) {
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

  state.battle = null;
  state.location = target;
  state.notice = target === "village"
    ? "討伐を終えて村へ戻りました。"
    : "Day Boardへ戻りました。";
  const operations = [{
    op: target === "village" ? "return_to_village" : "return_to_day_board",
  }];
  state.last_operations = operations;

  return {
    runtime,
    result: "returned",
    target,
    summary,
    operations,
  };
}
