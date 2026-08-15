import { assembleDayBoard } from "./mapless-day-board-generation.js";
import { resolveDayBoardCellDispatch } from "./mapless-day-board-cell-dispatch.js";
import { resolveDayBoardPlayableTurn } from "./mapless-day-board-playable-turn.js";
import { projectDayBoardEventName } from "./mapless-day-board-event-name-projection.js";
import { calculatePriorityCanonical, judgeCanonical, reduceHpCanonical } from "./battle-core-turn-vertical-slice.js";
import { resolveCaptureFlow } from "./battle-capture-flow.js";
import { routeCaughtQueueToPartyStorage } from "./caught-queue-party-storage.js";
import { resolveItemReceipt } from "./bag-economy-item-receipt.js";
import { clearStoredRun, hasStoredRun, persistRunState, restoreRunState } from "./browser-run-storage.js";
import { resolveExpLevelMoveFlow } from "./battle-exp-level-move-flow.js";
import { createPokemonRuntime, updatePokemonRuntime } from "./pokemon-runtime.js";

export const SAFARI_PLAYABLE_SAVE_KEY = "mapless.safari.playable.v4";
export const SAFARI_PLAYABLE_VALUE_IDS = Object.freeze(["player", "variables", "bag", "storage_system"]);

const PRE_SHUFFLE_KINDS = Object.freeze(["center", "shop", "egg_shop", "wild", "wild", "trainer", "trainer"]);
const GENERATION_DECISIONS = Object.freeze([
  { shuffle_order: [3, 0, 5, 1, 4, 2, 6], next_day_index: 7 },
  { shuffle_order: [6, 4, 1, 3, 0, 5, 2], next_day_index: 2 },
  { shuffle_order: [2, 5, 3, 0, 6, 4, 1], next_day_index: 5 },
  { shuffle_order: [4, 1, 6, 2, 5, 0, 3], next_day_index: 0 },
]);

export const SAFARI_MOVE_PRESENTATION = Object.freeze({
  TACKLE: Object.freeze({ name: "たいあたり", damage: 7, priority: 0 }),
  QUICK_ATTACK: Object.freeze({ name: "でんこうせっか", damage: 5, priority: 1 }),
  BITE: Object.freeze({ name: "かみつく", damage: 6, priority: 0 }),
  SWIFT: Object.freeze({ name: "スピードスター", damage: 6, priority: 0 }),
  THUNDERSHOCK: Object.freeze({ name: "でんきショック", damage: 4, priority: 0 }),
});

const TYPE_NAMES = Object.freeze({ ELECTRIC: "でんき" });

function generationForDay(day) {
  const decisions = GENERATION_DECISIONS[(Math.max(Number(day), 1) - 1) % GENERATION_DECISIONS.length];
  return {
    pre_shuffle_kinds: [...PRE_SHUFFLE_KINDS],
    shuffle_order: [...decisions.shuffle_order],
    next_day_index: decisions.next_day_index,
  };
}

function createStarter() {
  return createPokemonRuntime({
    species: "EEVEE",
    level: 5,
    exp: 125,
    hp: 20,
    max_hp: 20,
    personal_id: 1,
    gender: 0,
    status: "NONE",
    ability_id: "RUNAWAY",
    nature_id: "HARDY",
    moves: ["TACKLE", "QUICK_ATTACK", "BITE"],
  });
}

function createOpponent(kind, day) {
  if (kind === "trainer") {
    return createPokemonRuntime({
      species: "RATTATA",
      level: Math.max(5, Math.min(8, Number(day) + 4)),
      hp: 18,
      max_hp: 18,
      status: "NONE",
      moves: ["TACKLE"],
    });
  }
  return createPokemonRuntime({
    species: "PIKACHU",
    level: Math.max(5, Math.min(8, Number(day) + 4)),
    hp: 20,
    max_hp: 20,
    status: "NONE",
    moves: ["THUNDERSHOCK"],
  });
}

function materializeBoardEvents(boardKinds, day) {
  return boardKinds.map((kind, index) => {
    if (kind === "wild") {
      return {
        kind,
        type: "ELECTRIC",
        species_id: "PIKACHU",
        species_name: "ピカチュウ",
        level: Math.max(5, Math.min(8, Number(day) + 4)),
        slot: index,
      };
    }
    if (kind === "trainer") {
      return {
        kind,
        trainer_full_name: "たんぱんこぞう",
        species_id: "RATTATA",
        species_name: "コラッタ",
        level: Math.max(5, Math.min(8, Number(day) + 4)),
        slot: index,
      };
    }
    return { kind, slot: index };
  });
}

function createBoardState(day) {
  const generation = generationForDay(day);
  const board = assembleDayBoard({ day, ...generation });
  return {
    board_events: materializeBoardEvents(board.board_kinds, day),
    board_revealed: board.board_revealed,
    board_consumed: board.board_consumed,
    board_visited: Array(8).fill(false),
  };
}

function maplessState(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new TypeError("runtime variables.mapless state is required");
  }
  return state;
}

function moveId(move) {
  return typeof move === "string" ? move : move?.id;
}

function applyResolvedBoardState(state, resolved) {
  state.board_events = resolved.board_events;
  state.board_revealed = resolved.board_revealed;
  state.board_consumed = resolved.board_consumed;
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

function battlePresentation(operations) {
  const events = [];
  for (const operation of operations) {
    if (operation.op === "use_move") {
      events.push({ type: "move_selected", actor: operation.actor, moveId: operation.moveId });
      events.push({ type: "move_started", actor: operation.actor, target: operation.target, moveId: operation.moveId });
    } else if (operation.op === "accuracy_check" && !operation.hit) {
      events.push({ type: "miss", actor: operation.actor, target: operation.target });
    } else if (operation.op === "reduce_hp") {
      events.push({
        type: "damage_applied",
        actor: operation.actor,
        target: operation.target,
        amount: operation.amount,
        hpBefore: operation.hpBefore,
        hpAfter: operation.hpAfter,
      });
    } else if (operation.op === "faint") {
      events.push({ type: "faint", target: operation.target });
    } else if (operation.op === "end_of_round") {
      events.push({ type: "turn_end", turn: operation.turn });
    }
  }
  return events;
}

export function createSafariPlayableRuntime() {
  const board = createBoardState(1);
  return {
    player: { party: [createStarter()] },
    variables: {
      mapless: {
        schema_version: 1,
        day: 1,
        ...board,
        notice: "Day Boardからマスを選んでください。",
        battle: null,
        last_operations: [],
      },
    },
    bag: { slots: [], money: 0 },
    storage_system: {
      boxes: [{ name: "Box 1", capacity: 30, slots: [] }],
      currentBox: 0,
    },
  };
}

export function boardCellPresentation(runtime, index) {
  const state = maplessState(runtime);
  if (!Number.isInteger(index) || index < 0 || index >= state.board_events.length) {
    throw new RangeError("board index must be 0..7");
  }
  const event = state.board_events[index];
  const revealed = Boolean(state.board_revealed[index]);
  let label = "？？？";
  if (revealed) {
    if (event.kind === "trainer") label = "トレーナー戦";
    else label = projectDayBoardEventName(event, TYPE_NAMES);
  }
  return {
    index,
    kind: event.kind,
    label,
    revealed,
    consumed: Boolean(state.board_consumed[index]),
    disabled: Boolean(state.board_consumed[index] && !["shop", "egg_shop"].includes(event.kind)),
  };
}

function startBattle(runtime, event, index, dispatchOperations) {
  const state = maplessState(runtime);
  const opponent = createOpponent(event.kind, state.day);
  state.battle = {
    kind: event.kind,
    board_index: index,
    turn: 1,
    decision: 0,
    completed: false,
    captured: false,
    foe: opponent,
    last_operations: dispatchOperations,
    presentation: [{
      type: "battle_started",
      actor: "foe",
      species: opponent.species,
      trainer: event.trainer_full_name ?? null,
    }],
  };
  state.notice = event.kind === "trainer"
    ? event.trainer_full_name + "が勝負を仕掛けてきた！"
    : "野生の" + event.species_name + "が現れた！";
}

function applyFacilityEffects(runtime, operations) {
  if (!operations.some((operation) => operation.op === "heal_party" && operation.result === true)) return;
  runtime.player.party = runtime.player.party.map((pokemon) => updatePokemonRuntime(
    pokemon,
    { hp: pokemon.max_hp ?? pokemon.hp ?? 1, status: "NONE", status_count: 0 },
  ));
}

export function activateSafariDayBoardCell(runtime, index) {
  const state = maplessState(runtime);
  if (state.battle && !state.battle.completed) {
    return { runtime, result: "battle_active", boundary: "battle", notice: "戦闘を先に終えてください。", operations: [] };
  }
  const event = state.board_events[index];
  if (!event) throw new RangeError("board index must be 0..7");
  const reusable = ["shop", "egg_shop"].includes(event.kind);

  if (event.kind === "wild" || event.kind === "trainer") {
    const dispatch = resolveDayBoardCellDispatch({ ...baseTurnInput(state, index), reusable });
    applyResolvedBoardState(state, dispatch.state);
    state.last_operations = dispatch.operations;
    state.notice = dispatch.notice;
    if (dispatch.result === "dispatched") startBattle(runtime, event, index, dispatch.operations);
    return {
      runtime,
      result: dispatch.result,
      boundary: event.kind,
      notice: state.notice,
      operations: dispatch.operations,
      presentation: state.battle?.presentation ?? [],
    };
  }

  const input = baseTurnInput(state, index);
  if (event.kind === "next_day") {
    input.next_day = { confirmed: true, generation: generationForDay(state.day + 1) };
  } else if (["center", "shop", "egg_shop"].includes(event.kind)) {
    input.facility = { healed: true };
  } else if (event.kind === "normal_event") {
    input.normal_event = {
      event_name: event.normal_event_id ?? "出来事",
      open_result: true,
      normal_resolved_after_open: true,
      event_resolution: event.resolution ?? null,
    };
  }

  const turn = resolveDayBoardPlayableTurn(input);
  applyResolvedBoardState(state, turn.state);
  state.last_operations = turn.operations;
  state.notice = turn.notice ?? state.notice;
  applyFacilityEffects(runtime, turn.operations.flatMap((entry) => entry.resolved?.operations ?? [entry]));
  if (turn.day_transition?.board_regenerated) {
    state.day = turn.day_transition.day;
    state.board_events = materializeBoardEvents(turn.day_transition.board_kinds, state.day);
    state.board_revealed = turn.day_transition.board_revealed;
    state.board_consumed = turn.day_transition.board_consumed;
    state.board_visited = Array(8).fill(false);
  }
  return { runtime, result: turn.result, boundary: turn.boundary, notice: state.notice, operations: turn.operations };
}

function awardWin(runtime, battle) {
  const player = runtime.player.party[0];
  const expFlow = resolveExpLevelMoveFlow({
    pokemon: {
      exp: player.exp ?? 0,
      level: player.level,
      moves: player.moves.map(moveId),
    },
    maximumExp: 1_000_000,
    maxMoves: 4,
    expContext: {
      defeatedLevel: battle.foe.level,
      baseExp: 140,
      numParticipants: 1,
      expShareCount: 0,
      participant: true,
      hasExpShare: false,
      expAll: false,
      splitExpBetweenGainers: true,
      moreExpFromTrainerPokemon: battle.kind === "trainer",
      trainerBattle: battle.kind === "trainer",
      scaledExpFormula: false,
      outsiderMultiplier: 1,
    },
    levelThresholds: { 6: 216, 7: 343, 8: 512, 9: 729, 10: 1000 },
    movesByLevel: { 6: ["SWIFT"] },
    moveDecisions: {},
  });
  runtime.player.party[0] = updatePokemonRuntime(player, {
    exp: expFlow.pokemon.exp,
    level: expFlow.pokemon.level,
    moves: expFlow.pokemon.moves,
  });
  const receipt = resolveItemReceipt({
    slots: runtime.bag.slots,
    maxSlots: 20,
    maxPerSlot: 99,
    item: "POTION",
    quantity: 1,
    itemValid: true,
    kind: "prize",
    pocket: "MEDICINE",
  });
  runtime.bag.slots = receipt.slots;
  battle.exp_gained = expFlow.expGained;
  battle.reward = receipt.success ? { item: "POTION", quantity: 1 } : null;
  return [
    ...expFlow.operations.map((operation) => ({ ...operation, scope: "exp" })),
    ...receipt.operations.map((operation) => ({ ...operation, scope: "reward" })),
  ];
}

function finalizeBattle(runtime) {
  const state = maplessState(runtime);
  const battle = state.battle;
  const event = state.board_events[battle.board_index];
  const input = baseTurnInput(state, battle.board_index);
  if (battle.kind === "wild") {
    input.wild = {
      can_battle: true,
      encounter: { species_id: event.species_id, level: event.level },
      species_exists: true,
      species_name: event.species_name,
      outcome: battle.decision,
      run_end_pending: false,
      old_consumed: false,
      game_temp_present: true,
    };
  } else {
    input.trainer = {
      can_battle: true,
      dynamic_result: {
        outcome: battle.decision,
        trainer_full_name: event.trainer_full_name,
      },
      last_error: null,
    };
  }
  const turn = resolveDayBoardPlayableTurn(input);
  applyResolvedBoardState(state, turn.state);
  const completionOperations = [...turn.operations];
  if (battle.decision === 1) completionOperations.push(...awardWin(runtime, battle));
  battle.completed = true;
  battle.last_operations = [...battle.last_operations, ...completionOperations];
  battle.presentation = [
    ...battle.presentation,
    {
      type: "battle_result",
      decision: battle.decision,
      captured: battle.captured,
      expGained: battle.exp_gained ?? 0,
      reward: battle.reward ?? null,
    },
  ];
  state.last_operations = completionOperations;
  state.notice = battle.captured
    ? event.species_name + "を捕まえました。"
    : battle.decision === 1
      ? (battle.kind === "trainer" ? event.trainer_full_name : event.species_name) + "に勝利しました。"
      : "戦闘に敗北しました。";
}

export function resolveSafariBattleRound(runtime, selectedMoveId) {
  const state = maplessState(runtime);
  const battle = state.battle;
  if (!battle || battle.completed) throw new Error("active battle is required");
  const player = runtime.player.party[0];
  if (!player || !player.moves.some((move) => moveId(move) === selectedMoveId)) {
    throw new RangeError("selected move is not known by the active Pokemon");
  }
  const selected = SAFARI_MOVE_PRESENTATION[selectedMoveId];
  if (!selected) throw new RangeError("selected move is outside the Safari fixture");
  const foeMove = SAFARI_MOVE_PRESENTATION.THUNDERSHOCK;
  const priority = calculatePriorityCanonical([
    { actionIndex: 0, speed: 12, movePriority: selected.priority, tieBreaker: 1 },
    { actionIndex: 1, speed: 10, movePriority: foeMove.priority, tieBreaker: 0 },
  ]);
  const operations = [{ op: "calculate_priority", order: priority.order, entries: priority.entries }];
  let currentPlayer = player;
  let currentFoe = battle.foe;

  for (const actionIndex of priority.order) {
    const actor = actionIndex === 0 ? "player" : "foe";
    const target = actor === "player" ? "foe" : "player";
    const move = actor === "player" ? selected : foeMove;
    const id = actor === "player" ? selectedMoveId : "THUNDERSHOCK";
    operations.push({ op: "use_move", actor, target, moveId: id });
    operations.push({ op: "accuracy_check", actor, target, hit: true });
    const targetPokemon = target === "player" ? currentPlayer : currentFoe;
    const reduced = reduceHpCanonical({
      hp: targetPokemon.hp,
      totalHp: targetPokemon.max_hp,
      amount: move.damage,
      fainted: targetPokemon.hp <= 0,
      registerDamage: true,
    });
    operations.push({ op: "reduce_hp", actor, target, ...reduced });
    if (target === "player") currentPlayer = updatePokemonRuntime(currentPlayer, { hp: reduced.hpAfter });
    else currentFoe = updatePokemonRuntime(currentFoe, { hp: reduced.hpAfter });
    if (reduced.hpAfter <= 0) operations.push({ op: "faint", target });
    const decision = judgeCanonical({
      playerAllFainted: currentPlayer.hp <= 0,
      foeAllFainted: currentFoe.hp <= 0,
      drawDecision: 0,
    });
    operations.push({ op: "judge", actor, decision });
    if (decision > 0) {
      battle.decision = decision;
      break;
    }
  }

  runtime.player.party[0] = currentPlayer;
  battle.foe = currentFoe;
  operations.push({ op: "end_of_round", turn: battle.turn });
  battle.turn += 1;
  battle.last_operations = operations;
  battle.presentation = battlePresentation(operations);
  state.last_operations = operations;
  if (battle.decision > 0) finalizeBattle(runtime);
  return { runtime, decision: battle.decision, operations, presentation: battle.presentation };
}

export function attemptSafariCapture(runtime) {
  const state = maplessState(runtime);
  const battle = state.battle;
  if (!battle || battle.completed || battle.kind !== "wild") throw new Error("active wild battle is required");
  const capture = resolveCaptureFlow({
    targetFainted: battle.foe.hp <= 0,
    trainerBattle: false,
    ball: "POKEBALL",
    decision: 4,
    gainExpForCapture: false,
    allFaintedAfterCapture: false,
    capture: {
      totalHp: battle.foe.max_hp,
      hp: Math.max(1, battle.foe.hp),
      catchRate: 255,
      status: "SLEEP",
      ball: "POKEBALL",
      unconditional: true,
    },
  });
  if (capture.result !== "caught") {
    state.notice = "捕獲結果: " + capture.result;
    return { runtime, result: capture.result, operations: capture.operations, presentation: [] };
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
  battle.presentation = [{ type: "capture", result: "caught", destination: battle.capture_destination }];
  finalizeBattle(runtime);
  return {
    runtime,
    result: "caught",
    destination: battle.capture_destination,
    operations: battle.last_operations,
    presentation: battle.presentation,
  };
}

export function returnSafariToDayBoard(runtime) {
  const state = maplessState(runtime);
  if (!state.battle?.completed) throw new Error("completed battle is required");
  const summary = {
    decision: state.battle.decision,
    captured: state.battle.captured,
    expGained: state.battle.exp_gained ?? 0,
    reward: state.battle.reward ?? null,
  };
  state.battle = null;
  state.notice = "Day Boardへ戻りました。";
  return { runtime, summary, operations: [{ op: "return_to_day_board" }] };
}

function persistenceOptions() {
  return { key: SAFARI_PLAYABLE_SAVE_KEY, valueIds: SAFARI_PLAYABLE_VALUE_IDS };
}

export function hasSafariPlayableRun(storage) {
  return hasStoredRun(storage, SAFARI_PLAYABLE_SAVE_KEY);
}

export function saveSafariPlayableRun(storage, runtime) {
  maplessState(runtime);
  return persistRunState(storage, runtime, persistenceOptions());
}

export function loadSafariPlayableRun(storage, currentRuntime = createSafariPlayableRuntime()) {
  const loaded = restoreRunState(storage, currentRuntime, persistenceOptions());
  if (!loaded.found) return loaded;
  loaded.state.player.party = loaded.state.player.party.map(createPokemonRuntime);
  const battle = maplessState(loaded.state).battle;
  if (battle?.foe) battle.foe = createPokemonRuntime(battle.foe);
  return loaded;
}

export function clearSafariPlayableRun(storage) {
  return clearStoredRun(storage, SAFARI_PLAYABLE_SAVE_KEY);
}

