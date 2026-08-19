export const SAFARI_BATTLE_PHASE = Object.freeze({
  COMMAND: "COMMAND",
  ACTION_1: "ACTION_1",
  CHECK_1: "CHECK_1",
  ACTION_2: "ACTION_2",
  CHECK_2: "CHECK_2",
  POST_FAINT: "POST_FAINT",
  REPLACEMENT: "REPLACEMENT",
  POST_VICTORY: "POST_VICTORY",
  REWARD_GROWTH: "REWARD_GROWTH",
  RESULT: "RESULT",
  RETURN: "RETURN",
});

const ACTION_MARKERS = new Set([
  "use_move",
  "try_use_move_failed",
  "continue_status_request",
  "display_flinched",
  "display_confusion_self_damage",
]);

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new TypeError("runtime variables.mapless state is required");
  }
  return state;
}

function battleOf(runtime) {
  const battle = stateOf(runtime).battle;
  if (!battle || typeof battle !== "object" || Array.isArray(battle)) {
    throw new Error("active battle is required");
  }
  return battle;
}

function tracePhase(battle, phase, reason) {
  battle.phase = phase;
  const trace = Array.isArray(battle.phase_trace) ? battle.phase_trace : [];
  trace.push({
    phase,
    turn: Number(battle.turn ?? 0),
    reason: reason ?? null,
    completed: Boolean(battle.completed),
  });
  battle.phase_trace = trace.slice(-96);
  return phase;
}

function resolvedOperations(result) {
  return Array.isArray(result?.operations) ? result.operations : [];
}

function requestsPersistence(result) {
  return resolvedOperations(result).some((operation) => operation?.op === "request_save");
}

function actionActors(result) {
  const actors = [];
  for (const operation of resolvedOperations(result)) {
    if (!ACTION_MARKERS.has(operation?.op)) continue;
    const actor = operation.actor ?? (operation.op === "display_confusion_self_damage" ? operation.target : null);
    if (actor != null && !actors.includes(actor)) actors.push(actor);
  }
  return actors;
}

function commandConsumesAction(commandKind) {
  return ["item", "capture", "flee", "switch"].includes(String(commandKind ?? ""));
}

function hasFaint(result) {
  return resolvedOperations(result).some((operation) => operation?.op === "faint" || operation?.op === "faint_self");
}

function hasRewardGrowthTail(result) {
  return resolvedOperations(result).some((operation) => [
    "gain_exp",
    "level_up",
    "learn_move",
    "replace_move",
    "decline_move",
    "level_evolution",
    "trainer_prize_money",
    "item_received",
    "receive_item",
    "request_save",
  ].includes(operation?.op));
}

function rollbackSpeculativeAction(battle) {
  const trace = Array.isArray(battle.phase_trace) ? battle.phase_trace : [];
  if (battle.phase === SAFARI_BATTLE_PHASE.ACTION_1 && trace.at(-1)?.phase === SAFARI_BATTLE_PHASE.ACTION_1) {
    trace.pop();
    battle.phase_trace = trace;
  }
}

function rejectUnconsumedCommand(battle, result, commandKind) {
  rollbackSpeculativeAction(battle);
  battle.pending_command_kind = null;
  tracePhase(battle, SAFARI_BATTLE_PHASE.COMMAND, `command not consumed:${commandKind}`);
  result.phase = battle.phase;
  result.phaseTrace = structuredClone(battle.phase_trace ?? []);
  return result;
}

function commitRewardGrowthCheckpoint(battle, result, rewardGrowthCommit, reason) {
  tracePhase(battle, SAFARI_BATTLE_PHASE.REWARD_GROWTH, reason);
  if (typeof rewardGrowthCommit !== "function") return result;
  const committed = rewardGrowthCommit(result);
  return committed && committed !== result ? committed : result;
}

export function ensureSafariBattleOrchestrator(runtime) {
  const battle = battleOf(runtime);
  if (!battle.phase) tracePhase(battle, battle.completed ? SAFARI_BATTLE_PHASE.RESULT : SAFARI_BATTLE_PHASE.COMMAND, "initialize");
  if (!Array.isArray(battle.phase_trace)) battle.phase_trace = [];
  return battle.phase;
}

export function safariBattleCommandAllowed(runtime) {
  const battle = stateOf(runtime).battle;
  if (!battle || battle.completed) return false;
  return ensureSafariBattleOrchestrator(runtime) === SAFARI_BATTLE_PHASE.COMMAND;
}

export function beginSafariBattleCommand(runtime, commandKind = "move") {
  const battle = battleOf(runtime);
  const phase = ensureSafariBattleOrchestrator(runtime);
  if (phase !== SAFARI_BATTLE_PHASE.COMMAND) {
    throw new Error(`battle command is unavailable during ${phase}`);
  }
  battle.pending_command_kind = commandKind;
  tracePhase(battle, SAFARI_BATTLE_PHASE.ACTION_1, `command:${commandKind}`);
  return battle.phase;
}

export function abortSafariBattleCommand(runtime, reason = "command failed") {
  const battle = stateOf(runtime).battle;
  if (!battle) return null;
  if ([SAFARI_BATTLE_PHASE.RESULT, SAFARI_BATTLE_PHASE.RETURN, SAFARI_BATTLE_PHASE.REPLACEMENT].includes(battle.phase)) {
    return battle.phase;
  }
  rollbackSpeculativeAction(battle);
  battle.pending_command_kind = null;
  return tracePhase(battle, SAFARI_BATTLE_PHASE.COMMAND, reason);
}

export function commitSafariBattleResolution(runtime, result, commandKind = null, { rewardGrowthCommit = null } = {}) {
  const battle = battleOf(runtime);
  if (!battle.phase) ensureSafariBattleOrchestrator(runtime);

  // Terminal mechanics owners may be observed more than once by compatibility adapters.
  // RESULT is already the committed terminal boundary, so replaying the same resolution
  // must not append another POST_VICTORY/REWARD_GROWTH/RESULT tail or replay deferred commits.
  if (battle.phase === SAFARI_BATTLE_PHASE.RESULT && battle.completed) {
    battle.pending_command_kind = null;
    if (requestsPersistence(result)) result.persistenceRequested = true;
    result.phase = battle.phase;
    result.phaseTrace = structuredClone(battle.phase_trace ?? []);
    return result;
  }

  const resolvedCommandKind = commandKind ?? battle.pending_command_kind ?? "command";
  if (result?.turnConsumed === false) {
    return rejectUnconsumedCommand(battle, result, resolvedCommandKind);
  }

  const decision = Number(result?.decision ?? battle.decision ?? 0);
  const playerReplacementRequired = Boolean(result?.playerReplacementRequired ?? battle.player_replacement_required);
  const foeReplacementApplied = Boolean(result?.foeReplacementApplied);
  const terminalResolution = decision !== 0 || Boolean(battle.completed);

  // Compatibility mechanics owners may still set completed while producing terminal
  // operations. Hide that legacy detail before any orchestration checkpoint; RESULT is
  // the only externally visible completion boundary.
  if (terminalResolution) battle.completed = false;

  const actors = actionActors(result);
  const secondActionOccurred = commandConsumesAction(resolvedCommandKind) ? actors.length >= 1 : actors.length >= 2;
  tracePhase(battle, SAFARI_BATTLE_PHASE.CHECK_1, "first action resolved");
  if (secondActionOccurred) {
    tracePhase(battle, SAFARI_BATTLE_PHASE.ACTION_2, "second action resolved");
    tracePhase(battle, SAFARI_BATTLE_PHASE.CHECK_2, "second action checked");
  }

  const fainted = hasFaint(result) || playerReplacementRequired || foeReplacementApplied || terminalResolution;
  if (fainted) tracePhase(battle, SAFARI_BATTLE_PHASE.POST_FAINT, "faint/terminal checkpoint");

  if (playerReplacementRequired) {
    tracePhase(battle, SAFARI_BATTLE_PHASE.REPLACEMENT, "player replacement required");
  } else if (foeReplacementApplied && decision === 0) {
    tracePhase(battle, SAFARI_BATTLE_PHASE.REPLACEMENT, "trainer reserve sent out");
    // The compatibility round owner can already expose per-KO EXP/level/move operations.
    // They belong to the central growth checkpoint even though the battle continues with
    // a reserve, so do not skip REWARD_GROWTH just because RESULT is not terminal yet.
    if (hasRewardGrowthTail(result)) {
      result = commitRewardGrowthCheckpoint(battle, result, rewardGrowthCommit, "replacement growth checkpoint");
    }
    tracePhase(battle, SAFARI_BATTLE_PHASE.COMMAND, "replacement completed");
  } else if (terminalResolution) {
    tracePhase(battle, SAFARI_BATTLE_PHASE.POST_VICTORY, decision === 1 ? "victory" : "terminal result");
    result = commitRewardGrowthCheckpoint(
      battle,
      result,
      rewardGrowthCommit,
      hasRewardGrowthTail(result) || decision === 1 ? "automatic growth/reward tail" : "automatic growth/reward checkpoint",
    );
    tracePhase(battle, SAFARI_BATTLE_PHASE.RESULT, "battle result ready");
    battle.completed = true;
    battle.completed_phase = SAFARI_BATTLE_PHASE.RESULT;
  } else {
    tracePhase(battle, SAFARI_BATTLE_PHASE.COMMAND, `round complete:${resolvedCommandKind}`);
  }

  battle.pending_command_kind = null;
  if (requestsPersistence(result)) result.persistenceRequested = true;
  result.phase = battle.phase;
  result.phaseTrace = structuredClone(battle.phase_trace ?? []);
  return result;
}

export function completeSafariBattleReplacement(runtime, result = {}) {
  const battle = battleOf(runtime);
  const phase = ensureSafariBattleOrchestrator(runtime);
  if (phase !== SAFARI_BATTLE_PHASE.REPLACEMENT) {
    throw new Error(`battle replacement is unavailable during ${phase}`);
  }
  if (battle.player_replacement_required) {
    throw new Error("replacement owner did not clear player replacement requirement");
  }
  tracePhase(battle, SAFARI_BATTLE_PHASE.COMMAND, "player replacement completed");
  result.phase = battle.phase;
  result.phaseTrace = structuredClone(battle.phase_trace ?? []);
  return result;
}

export function beginSafariBattleReturn(runtime) {
  const state = stateOf(runtime);
  const battle = battleOf(runtime);
  const phase = ensureSafariBattleOrchestrator(runtime);
  if (phase !== SAFARI_BATTLE_PHASE.RESULT) {
    throw new Error(`battle return is unavailable during ${phase}`);
  }
  tracePhase(battle, SAFARI_BATTLE_PHASE.RETURN, "return requested");
  state.last_battle_phase_trace = structuredClone(battle.phase_trace ?? []);
  return battle.phase;
}

export function abortSafariBattleReturn(runtime, reason = "return failed") {
  const state = stateOf(runtime);
  const battle = state.battle;
  if (!battle) return null;
  const phase = ensureSafariBattleOrchestrator(runtime);
  if (phase !== SAFARI_BATTLE_PHASE.RETURN) return phase;
  tracePhase(battle, SAFARI_BATTLE_PHASE.RESULT, reason);
  state.last_battle_phase_trace = structuredClone(battle.phase_trace ?? []);
  return battle.phase;
}

export function completeSafariBattleReturn(runtime, result = {}) {
  const state = stateOf(runtime);
  const battle = state.battle;
  if (battle) state.last_battle_phase_trace = structuredClone(battle.phase_trace ?? state.last_battle_phase_trace ?? []);
  const operations = Array.isArray(result.operations) ? [...result.operations] : [];
  if (!operations.some((operation) => operation?.op === "request_save")) {
    operations.push({ op: "request_save", reason: "battle return committed" });
  }
  result.operations = operations;
  result.persistenceRequested = true;
  state.last_operations = operations;
  result.phase = SAFARI_BATTLE_PHASE.RETURN;
  result.phaseTrace = structuredClone(state.last_battle_phase_trace ?? []);
  return result;
}
