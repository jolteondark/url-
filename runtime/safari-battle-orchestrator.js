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

function hasDeferredGrowth(result) {
  return (result?.expIntegration?.commits ?? []).some((commit) => commit?.deferred === true);
}

function hasRewardGrowthTail(result) {
  return hasDeferredGrowth(result) || resolvedOperations(result).some((operation) => [
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
  battle.pending_command_sequence = null;
  tracePhase(battle, SAFARI_BATTLE_PHASE.COMMAND, `command not consumed:${commandKind}`);
  result.phase = battle.phase;
  result.phaseTrace = structuredClone(battle.phase_trace ?? []);
  return result;
}

function rewardGrowthCheckpointKey(battle, reason) {
  return [
    Number(battle.turn ?? 0),
    Number(battle.decision ?? 0),
    String(reason ?? "reward growth"),
  ].join(":");
}

function incompleteRewardGrowthError(battle) {
  const checkpoint = battle?.reward_growth_checkpoint;
  if (battle?.phase !== SAFARI_BATTLE_PHASE.REWARD_GROWTH || checkpoint?.committed !== false) return null;
  return new Error(`reward growth checkpoint is incomplete and cannot be replayed: ${checkpoint.key ?? "unknown"}`);
}

function commitRewardGrowthCheckpoint(battle, result, rewardGrowthCommit, reason) {
  const key = rewardGrowthCheckpointKey(battle, reason);
  const existing = battle.reward_growth_checkpoint;
  if (existing?.key === key) {
    if (existing.committed === true) return result;
    throw incompleteRewardGrowthError(battle) ?? new Error(`reward growth checkpoint is incomplete: ${key}`);
  }

  tracePhase(battle, SAFARI_BATTLE_PHASE.REWARD_GROWTH, reason);
  const checkpoint = {
    key,
    turn: Number(battle.turn ?? 0),
    decision: Number(battle.decision ?? 0),
    reason: reason ?? null,
    committed: false,
  };
  battle.reward_growth_checkpoint = checkpoint;

  if (typeof rewardGrowthCommit !== "function") {
    checkpoint.committed = true;
    return result;
  }

  try {
    const committed = rewardGrowthCommit(result);
    checkpoint.committed = true;
    return committed && committed !== result ? committed : result;
  } catch (error) {
    checkpoint.errorName = error?.name ?? "Error";
    checkpoint.errorMessage = error?.message ?? String(error);
    throw error;
  }
}

function replacementCheckpointKey(battle, reason) {
  return [
    Number(battle.pending_command_sequence ?? battle.command_sequence ?? 0),
    String(reason ?? "replacement"),
  ].join(":");
}

function incompleteReplacementError(battle) {
  const checkpoint = battle?.replacement_checkpoint;
  if (battle?.phase !== SAFARI_BATTLE_PHASE.REPLACEMENT || checkpoint?.committed !== false) return null;
  return new Error(`replacement checkpoint is incomplete and cannot be replayed: ${checkpoint.key ?? "unknown"}`);
}

function replacementCommitApplied(committed, side) {
  if (side === "player") {
    return committed?.playerReplacementApplied === true && committed?.playerReplacementRequired === false;
  }
  return committed?.foeReplacementApplied === true;
}

function commitReplacementCheckpoint(battle, result, replacementCommit, reason, side = "foe") {
  const key = replacementCheckpointKey(battle, reason);
  const existing = battle.replacement_checkpoint;
  if (existing?.key === key) {
    if (existing.committed === true) return result;
    throw incompleteReplacementError(battle) ?? new Error(`replacement checkpoint is incomplete: ${key}`);
  }

  tracePhase(battle, SAFARI_BATTLE_PHASE.REPLACEMENT, reason);
  const checkpoint = {
    key,
    sequence: Number(battle.pending_command_sequence ?? battle.command_sequence ?? 0),
    reason: reason ?? null,
    side,
    committed: false,
  };
  battle.replacement_checkpoint = checkpoint;

  if (typeof replacementCommit !== "function") {
    checkpoint.errorName = "Error";
    checkpoint.errorMessage = `${side} replacement commit owner is required`;
    throw new Error(checkpoint.errorMessage);
  }

  try {
    const committed = replacementCommit(result);
    if (!replacementCommitApplied(committed, side)) {
      throw new Error(`${side} replacement owner did not apply replacement`);
    }
    checkpoint.committed = true;
    return committed && committed !== result ? committed : result;
  } catch (error) {
    checkpoint.errorName = error?.name ?? "Error";
    checkpoint.errorMessage = error?.message ?? String(error);
    throw error;
  }
}

function resolutionCheckpointSequence(battle) {
  return Number(battle.pending_command_sequence ?? battle.command_sequence ?? 0);
}

function incompleteResolutionError(checkpoint) {
  if (!checkpoint || checkpoint.committed !== false) return null;
  return new Error(`battle resolution checkpoint is incomplete and cannot be replayed: ${checkpoint.sequence ?? "unknown"}`);
}

function replayCommittedResolution(battle, result, commandKind) {
  const checkpoint = battle.resolution_checkpoint;
  const sequence = resolutionCheckpointSequence(battle);
  if (!checkpoint || checkpoint.sequence !== sequence || checkpoint.commandKind !== commandKind) return null;
  if (checkpoint.committed !== true) throw incompleteResolutionError(checkpoint);
  battle.pending_command_kind = null;
  battle.pending_command_sequence = null;
  if (requestsPersistence(result)) result.persistenceRequested = true;
  result.phase = battle.phase;
  result.phaseTrace = structuredClone(battle.phase_trace ?? []);
  return result;
}

function beginResolutionCheckpoint(battle, commandKind) {
  const checkpoint = {
    sequence: resolutionCheckpointSequence(battle),
    commandKind,
    committed: false,
  };
  battle.resolution_checkpoint = checkpoint;
  return checkpoint;
}

function returnCheckpointKey(battle) {
  return [
    Number(battle.turn ?? 0),
    Number(battle.decision ?? 0),
    Number((battle.phase_trace ?? []).length),
  ].join(":");
}

export function ensureSafariBattleOrchestrator(runtime) {
  const state = stateOf(runtime);
  const battle = battleOf(runtime);
  if (!battle.phase) {
    if (!battle.completed) {
      state.pending_battle_return_checkpoint = null;
      state.battle_return_checkpoint = null;
      battle.resolution_checkpoint = null;
      battle.replacement_checkpoint = null;
    }
    tracePhase(battle, battle.completed ? SAFARI_BATTLE_PHASE.RESULT : SAFARI_BATTLE_PHASE.COMMAND, "initialize");
  }
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
  battle.command_sequence = Number(battle.command_sequence ?? 0) + 1;
  battle.pending_command_sequence = battle.command_sequence;
  battle.pending_command_kind = commandKind;
  tracePhase(battle, SAFARI_BATTLE_PHASE.ACTION_1, `command:${commandKind}`);
  return battle.phase;
}

export function abortSafariBattleCommand(runtime, reason = "command failed") {
  const battle = stateOf(runtime).battle;
  if (!battle) return null;
  if (battle.phase !== SAFARI_BATTLE_PHASE.ACTION_1) return battle.phase;
  rollbackSpeculativeAction(battle);
  battle.pending_command_kind = null;
  battle.pending_command_sequence = null;
  return tracePhase(battle, SAFARI_BATTLE_PHASE.COMMAND, reason);
}

export function commitSafariBattleResolution(runtime, result, commandKind = null, {
  rewardGrowthCommit = null,
  replacementCommit = null,
} = {}) {
  const battle = battleOf(runtime);
  if (!battle.phase) ensureSafariBattleOrchestrator(runtime);

  const incompleteGrowth = incompleteRewardGrowthError(battle);
  if (incompleteGrowth) throw incompleteGrowth;
  const incompleteReplacement = incompleteReplacementError(battle);
  if (incompleteReplacement) throw incompleteReplacement;

  if (battle.phase === SAFARI_BATTLE_PHASE.RESULT && battle.completed) {
    battle.pending_command_kind = null;
    battle.pending_command_sequence = null;
    if (requestsPersistence(result)) result.persistenceRequested = true;
    result.phase = battle.phase;
    result.phaseTrace = structuredClone(battle.phase_trace ?? []);
    return result;
  }

  const resolvedCommandKind = commandKind ?? battle.pending_command_kind ?? "command";
  if (result?.turnConsumed === false) {
    return rejectUnconsumedCommand(battle, result, resolvedCommandKind);
  }

  const replayed = replayCommittedResolution(battle, result, resolvedCommandKind);
  if (replayed) return replayed;
  const resolutionCheckpoint = beginResolutionCheckpoint(battle, resolvedCommandKind);

  const decision = Number(result?.decision ?? battle.decision ?? 0);
  const playerReplacementRequired = Boolean(result?.playerReplacementRequired ?? battle.player_replacement_required);
  const foeReplacementRequired = Boolean(result?.foeReplacementRequired);
  const foeReplacementApplied = Boolean(result?.foeReplacementApplied);
  const terminalResolution = decision !== 0 || Boolean(battle.completed);

  if (terminalResolution) battle.completed = false;

  const actors = actionActors(result);
  const secondActionOccurred = commandConsumesAction(resolvedCommandKind) ? actors.length >= 1 : actors.length >= 2;
  tracePhase(battle, SAFARI_BATTLE_PHASE.CHECK_1, "first action resolved");
  if (secondActionOccurred) {
    tracePhase(battle, SAFARI_BATTLE_PHASE.ACTION_2, "second action resolved");
    tracePhase(battle, SAFARI_BATTLE_PHASE.CHECK_2, "second action checked");
  }

  const fainted = hasFaint(result) || playerReplacementRequired || foeReplacementRequired || foeReplacementApplied || terminalResolution;
  if (fainted) tracePhase(battle, SAFARI_BATTLE_PHASE.POST_FAINT, "faint/terminal checkpoint");

  if (terminalResolution) {
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
  } else if (playerReplacementRequired) {
    if (foeReplacementRequired) {
      result = commitReplacementCheckpoint(battle, result, replacementCommit, "trainer reserve replacement", "foe");
    } else {
      tracePhase(battle, SAFARI_BATTLE_PHASE.REPLACEMENT, "player replacement required");
    }
    if (hasDeferredGrowth(result)) {
      battle.pending_reward_growth = {
        expIntegration: structuredClone(result.expIntegration),
        recipientPartyIndex: Number(battle.player_party_index ?? 0),
      };
    }
  } else if (foeReplacementRequired && decision === 0) {
    result = commitReplacementCheckpoint(battle, result, replacementCommit, "trainer reserve replacement", "foe");
    if (hasRewardGrowthTail(result)) {
      result = commitRewardGrowthCheckpoint(battle, result, rewardGrowthCommit, "replacement growth checkpoint");
    }
    tracePhase(battle, SAFARI_BATTLE_PHASE.COMMAND, "replacement completed");
  } else if (foeReplacementApplied && decision === 0) {
    tracePhase(battle, SAFARI_BATTLE_PHASE.REPLACEMENT, "trainer reserve sent out");
    if (hasRewardGrowthTail(result)) {
      result = commitRewardGrowthCheckpoint(battle, result, rewardGrowthCommit, "replacement growth checkpoint");
    }
    tracePhase(battle, SAFARI_BATTLE_PHASE.COMMAND, "replacement completed");
  } else {
    tracePhase(battle, SAFARI_BATTLE_PHASE.COMMAND, `round complete:${resolvedCommandKind}`);
  }

  resolutionCheckpoint.committed = true;
  resolutionCheckpoint.phase = battle.phase;
  battle.pending_command_kind = null;
  battle.pending_command_sequence = null;
  if (requestsPersistence(result)) result.persistenceRequested = true;
  result.phase = battle.phase;
  result.phaseTrace = structuredClone(battle.phase_trace ?? []);
  return result;
}

export function completeSafariBattleReplacement(runtime, result = {}, {
  rewardGrowthCommit = null,
  replacementCommit = null,
} = {}) {
  const battle = battleOf(runtime);
  const incompleteGrowth = incompleteRewardGrowthError(battle);
  if (incompleteGrowth) throw incompleteGrowth;
  const incompleteReplacement = incompleteReplacementError(battle);
  if (incompleteReplacement) throw incompleteReplacement;
  const phase = ensureSafariBattleOrchestrator(runtime);
  if (phase !== SAFARI_BATTLE_PHASE.REPLACEMENT) {
    throw new Error(`battle replacement is unavailable during ${phase}`);
  }
  if (battle.player_replacement_required) {
    result = commitReplacementCheckpoint(battle, result, replacementCommit, "player replacement", "player");
  }
  if (battle.player_replacement_required || result?.playerReplacementRequired === true) {
    throw new Error("replacement owner did not clear player replacement requirement");
  }
  const pendingGrowth = battle.pending_reward_growth ?? null;
  if (pendingGrowth) {
    result = commitRewardGrowthCheckpoint(battle, {
      ...result,
      expIntegration: structuredClone(pendingGrowth.expIntegration),
      rewardGrowthRecipientPartyIndex: Number(pendingGrowth.recipientPartyIndex),
    }, rewardGrowthCommit, "replacement growth checkpoint");
    battle.pending_reward_growth = null;
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
  state.pending_battle_return_checkpoint = {
    key: returnCheckpointKey(battle),
    committed: false,
    phaseTrace: structuredClone(battle.phase_trace ?? []),
  };
  state.last_battle_phase_trace = structuredClone(battle.phase_trace ?? []);
  return battle.phase;
}

export function abortSafariBattleReturn(runtime, reason = "return failed") {
  const state = stateOf(runtime);
  const battle = state.battle;
  if (!battle) return null;
  const phase = ensureSafariBattleOrchestrator(runtime);
  if (phase !== SAFARI_BATTLE_PHASE.RETURN) return phase;
  state.pending_battle_return_checkpoint = null;
  tracePhase(battle, SAFARI_BATTLE_PHASE.RESULT, reason);
  state.last_battle_phase_trace = structuredClone(battle.phase_trace ?? []);
  return battle.phase;
}

export function completeSafariBattleReturn(runtime, result = {}) {
  const state = stateOf(runtime);
  const battle = state.battle;
  if (battle) state.last_battle_phase_trace = structuredClone(battle.phase_trace ?? state.last_battle_phase_trace ?? []);

  const committedCheckpoint = state.battle_return_checkpoint;
  if (committedCheckpoint?.committed === true) {
    result.operations = structuredClone(committedCheckpoint.operations ?? []);
    result.persistenceRequested = true;
    state.last_operations = structuredClone(committedCheckpoint.operations ?? []);
    result.phase = SAFARI_BATTLE_PHASE.RETURN;
    result.phaseTrace = structuredClone(committedCheckpoint.phaseTrace ?? state.last_battle_phase_trace ?? []);
    return result;
  }

  const pendingCheckpoint = state.pending_battle_return_checkpoint ?? {
    key: `compat:${Number(state.last_battle_phase_trace?.length ?? 0)}`,
    committed: false,
    phaseTrace: structuredClone(state.last_battle_phase_trace ?? []),
  };
  const operations = Array.isArray(result.operations) ? [...result.operations] : [];
  if (!operations.some((operation) => operation?.op === "request_save")) {
    operations.push({ op: "request_save", reason: "battle return committed" });
  }
  result.operations = operations;
  result.persistenceRequested = true;
  state.last_operations = operations;
  result.phase = SAFARI_BATTLE_PHASE.RETURN;
  result.phaseTrace = structuredClone(pendingCheckpoint.phaseTrace ?? state.last_battle_phase_trace ?? []);
  state.battle_return_checkpoint = {
    ...structuredClone(pendingCheckpoint),
    committed: true,
    operations: structuredClone(operations),
    phaseTrace: structuredClone(result.phaseTrace),
  };
  state.pending_battle_return_checkpoint = null;
  return result;
}
