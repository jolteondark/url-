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

const issuedPresentationAckTokens = new WeakSet();
const issuedCommandAttemptTokens = new WeakSet();
let nextBattleInstanceSequence = 1;

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

function tracePhase(battle, phase, reason, details = null) {
  battle.phase = phase;
  const trace = Array.isArray(battle.phase_trace) ? battle.phase_trace : [];
  trace.push({
    phase,
    turn: Number(battle.turn ?? 0),
    reason: reason ?? null,
    completed: Boolean(battle.completed),
    ...(details && typeof details === "object" ? details : {}),
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

function materializeActionOrder(battle, result, commandKind) {
  const actors = actionActors(result);
  const trace = Array.isArray(battle.phase_trace) ? battle.phase_trace : [];
  const actionOne = trace.at(-1);
  if (actionOne?.phase === SAFARI_BATTLE_PHASE.ACTION_1) {
    const firstActor = commandConsumesAction(commandKind) ? "player" : (actors[0] ?? null);
    actionOne.actor = firstActor;
    actionOne.reason = firstActor
      ? `first action:${firstActor}`
      : `command:${commandKind}`;
  }
  return actors;
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

function clearPendingCommandAttempt(battle) {
  battle.pending_command_attempt_required = false;
}

function rejectUnconsumedCommand(battle, result, commandKind) {
  rollbackSpeculativeAction(battle);
  battle.pending_command_kind = null;
  battle.pending_command_sequence = null;
  clearPendingCommandAttempt(battle);
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

function requirePendingCommandProvenance(battle, commandKind) {
  const pendingSequence = Number(battle.pending_command_sequence);
  const commandSequence = Number(battle.command_sequence ?? 0);
  const pendingKind = battle.pending_command_kind;
  if (
    !Number.isInteger(pendingSequence) ||
    pendingSequence <= 0 ||
    pendingSequence !== commandSequence ||
    pendingKind == null
  ) {
    throw new Error("fresh battle resolution requires a centrally issued pending command");
  }
  if (String(pendingKind) !== String(commandKind)) {
    throw new Error(`battle resolution command kind ${commandKind} does not match pending command ${pendingKind}`);
  }
  return pendingSequence;
}

function ensureBattleInstanceSequence(battle) {
  const existing = Number(battle.orchestrator_battle_instance_sequence);
  if (Number.isInteger(existing) && existing > 0) {
    nextBattleInstanceSequence = Math.max(nextBattleInstanceSequence, existing + 1);
    return existing;
  }
  const sequence = nextBattleInstanceSequence;
  nextBattleInstanceSequence += 1;
  battle.orchestrator_battle_instance_sequence = sequence;
  return sequence;
}

function resultBattleInstanceSequence(result) {
  const raw = result?.orchestratorBattleInstanceSequence;
  if (raw == null) return null;
  const sequence = Number(raw);
  if (!Number.isInteger(sequence) || sequence <= 0) {
    throw new TypeError("battle resolution orchestratorBattleInstanceSequence must be a positive integer");
  }
  return sequence;
}

function resultCommandSequence(result) {
  const raw = result?.orchestratorCommandSequence;
  if (raw == null) return null;
  const sequence = Number(raw);
  if (!Number.isInteger(sequence) || sequence < 0) {
    throw new TypeError("battle resolution orchestratorCommandSequence must be a non-negative integer");
  }
  return sequence;
}

function resolveCommandKindForCommit(battle, result, commandKind) {
  if (commandKind != null) return commandKind;
  const checkpoint = battle.resolution_checkpoint;
  if (checkpoint?.committed === true) {
    const taggedBattle = resultBattleInstanceSequence(result);
    const taggedCommand = resultCommandSequence(result);
    if (
      taggedBattle === checkpoint.battleInstanceSequence &&
      taggedCommand === checkpoint.sequence
    ) {
      return checkpoint.commandKind;
    }
  }
  return battle.pending_command_kind ?? "command";
}

function validateResolutionAgainstPendingCommand(battle, result) {
  const sequence = resolutionCheckpointSequence(battle);
  const battleInstanceSequence = ensureBattleInstanceSequence(battle);
  const taggedBattle = resultBattleInstanceSequence(result);
  if (taggedBattle != null && taggedBattle !== battleInstanceSequence) {
    throw new Error(
      `stale battle resolution belongs to battle instance ${taggedBattle}; current battle instance is ${battleInstanceSequence}`,
    );
  }
  const tagged = resultCommandSequence(result);
  if (tagged != null && tagged !== sequence) {
    throw new Error(`stale battle resolution belongs to command sequence ${tagged}; current command sequence is ${sequence}`);
  }
  return { sequence, battleInstanceSequence };
}

function validateCommandAttempt(battle, token, commandKind) {
  if (!token || typeof token !== "object" || !issuedCommandAttemptTokens.has(token)) {
    throw new Error("battle resolution requires a command attempt token issued by the central orchestrator");
  }
  if (token.battle !== battle) {
    throw new Error("stale battle command attempt belongs to a different battle instance");
  }
  const battleInstanceSequence = ensureBattleInstanceSequence(battle);
  if (Number(token.battleInstanceSequence) !== battleInstanceSequence) {
    throw new Error("stale battle command attempt belongs to a different battle instance sequence");
  }
  const pendingSequence = requirePendingCommandProvenance(battle, commandKind);
  if (Number(token.sequence) !== pendingSequence) {
    throw new Error(`stale battle command attempt belongs to command sequence ${token.sequence}; current command sequence is ${pendingSequence}`);
  }
  if (String(token.commandKind) !== String(commandKind)) {
    throw new Error(`battle command attempt kind ${token.commandKind} does not match pending command ${commandKind}`);
  }
  return token;
}

function bindResolutionToPendingCommand(battle, result) {
  const { sequence, battleInstanceSequence } = validateResolutionAgainstPendingCommand(battle, result);
  if (result && typeof result === "object") {
    result.orchestratorBattleInstanceSequence = battleInstanceSequence;
    result.orchestratorCommandSequence = sequence;
  }
  return sequence;
}

function incompleteResolutionError(checkpoint) {
  if (!checkpoint || checkpoint.committed !== false) return null;
  return new Error(`battle resolution checkpoint is incomplete and cannot be replayed: ${checkpoint.sequence ?? "unknown"}`);
}

function replayCommittedResolution(battle, result, commandKind) {
  const checkpoint = battle.resolution_checkpoint;
  const sequence = resolutionCheckpointSequence(battle);
  const battleInstanceSequence = ensureBattleInstanceSequence(battle);
  if (
    !checkpoint ||
    checkpoint.sequence !== sequence ||
    checkpoint.battleInstanceSequence !== battleInstanceSequence ||
    checkpoint.commandKind !== commandKind
  ) return null;
  const taggedBattle = resultBattleInstanceSequence(result);
  if (taggedBattle == null || taggedBattle !== checkpoint.battleInstanceSequence) return null;
  const tagged = resultCommandSequence(result);
  if (tagged == null || tagged !== checkpoint.sequence) return null;
  if (checkpoint.committed !== true) throw incompleteResolutionError(checkpoint);
  if (!checkpoint.committedResult) {
    throw new Error(`committed battle resolution snapshot is missing: ${checkpoint.sequence ?? "unknown"}`);
  }
  const committedResult = structuredClone(checkpoint.committedResult);
  battle.pending_command_kind = null;
  battle.pending_command_sequence = null;
  clearPendingCommandAttempt(battle);
  if (requestsPersistence(committedResult)) committedResult.persistenceRequested = true;
  committedResult.phase = battle.phase;
  committedResult.phaseTrace = structuredClone(battle.phase_trace ?? []);
  return committedResult;
}

function beginResolutionCheckpoint(battle, commandKind) {
  const checkpoint = {
    battleInstanceSequence: ensureBattleInstanceSequence(battle),
    sequence: resolutionCheckpointSequence(battle),
    commandKind,
    committed: false,
  };
  battle.resolution_checkpoint = checkpoint;
  return checkpoint;
}

function deferCommandUntilPresentation(battle, reason) {
  const sequence = Number(battle.pending_command_sequence ?? battle.command_sequence ?? 0);
  const checkpointReason = reason ?? null;
  const existing = battle.presentation_checkpoint;
  if (existing?.committed === false) {
    if (
      Number(existing.sequence) !== sequence ||
      existing.phase !== battle.phase ||
      (existing.reason ?? null) !== checkpointReason
    ) {
      throw new Error("battle presentation checkpoint is already pending for a different command boundary");
    }
    return battle.phase;
  }
  battle.presentation_checkpoint = {
    sequence,
    phase: battle.phase,
    reason: checkpointReason,
    committed: false,
  };
  return battle.phase;
}

function resumeCommandAfterResolution(battle, reason) {
  if (battle.presentation_ack_required === true) {
    return deferCommandUntilPresentation(battle, reason);
  }
  return tracePhase(battle, SAFARI_BATTLE_PHASE.COMMAND, reason);
}

function returnCheckpointKey(battle) {
  return [
    Number(battle.turn ?? 0),
    Number(battle.decision ?? 0),
    Number((battle.phase_trace ?? []).length),
  ].join(":");
}

function completedResultRecorded(battle) {
  if (battle.completed !== true) return false;
  if (battle.completed_phase === SAFARI_BATTLE_PHASE.RESULT) return true;
  const trace = Array.isArray(battle.phase_trace) ? battle.phase_trace : [];
  return trace.some((entry) => entry?.phase === SAFARI_BATTLE_PHASE.RESULT);
}

export function ensureSafariBattleOrchestrator(runtime) {
  const state = stateOf(runtime);
  const battle = battleOf(runtime);
  if (!battle.phase) {
    const restoredResult = completedResultRecorded(battle);
    if (battle.completed === true && !restoredResult) {
      throw new Error("completed battle cannot initialize RESULT without a recorded RESULT boundary");
    }
    if (!restoredResult) {
      if (state.pending_battle_return_checkpoint?.committed === false) {
        throw new Error("fresh battle cannot initialize while RETURN persistence is pending");
      }
      state.pending_battle_return_checkpoint = null;
      state.battle_return_checkpoint = null;
      battle.resolution_checkpoint = null;
      battle.replacement_checkpoint = null;
      battle.presentation_checkpoint = null;
      clearPendingCommandAttempt(battle);
    } else {
      battle.completed_phase = SAFARI_BATTLE_PHASE.RESULT;
    }
    ensureBattleInstanceSequence(battle);
    tracePhase(battle, restoredResult ? SAFARI_BATTLE_PHASE.RESULT : SAFARI_BATTLE_PHASE.COMMAND, "initialize");
  } else {
    ensureBattleInstanceSequence(battle);
  }
  if (!Array.isArray(battle.phase_trace)) battle.phase_trace = [];
  return battle.phase;
}

export function safariBattleCommandAllowed(runtime) {
  const battle = stateOf(runtime).battle;
  if (!battle) return false;
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
  clearPendingCommandAttempt(battle);
  tracePhase(battle, SAFARI_BATTLE_PHASE.ACTION_1, `command:${commandKind}`);
  return battle.phase;
}

export function captureSafariBattleCommandAttempt(runtime) {
  const battle = battleOf(runtime);
  if (battle.phase !== SAFARI_BATTLE_PHASE.ACTION_1) {
    throw new Error(`battle command attempt is unavailable during ${battle.phase}`);
  }
  const commandKind = battle.pending_command_kind;
  const sequence = requirePendingCommandProvenance(battle, commandKind);
  const token = Object.freeze({
    battle,
    battleInstanceSequence: ensureBattleInstanceSequence(battle),
    sequence,
    commandKind,
  });
  issuedCommandAttemptTokens.add(token);
  battle.pending_command_attempt_required = true;
  return token;
}

export function abortSafariBattleCommand(runtime, reason = "command failed", { commandAttempt = null } = {}) {
  const battle = stateOf(runtime).battle;
  if (!battle) return null;
  if (battle.phase !== SAFARI_BATTLE_PHASE.ACTION_1) return battle.phase;
  const commandKind = battle.pending_command_kind;
  if (battle.pending_command_attempt_required === true || commandAttempt != null) {
    validateCommandAttempt(battle, commandAttempt, commandKind);
  }
  rollbackSpeculativeAction(battle);
  battle.pending_command_kind = null;
  battle.pending_command_sequence = null;
  clearPendingCommandAttempt(battle);
  return tracePhase(battle, SAFARI_BATTLE_PHASE.COMMAND, reason);
}

export function commitSafariBattleResolution(runtime, result, commandKind = null, {
  rewardGrowthCommit = null,
  replacementCommit = null,
  commandAttempt = null,
} = {}) {
  const battle = battleOf(runtime);
  if (!battle.phase) ensureSafariBattleOrchestrator(runtime);

  const incompleteGrowth = incompleteRewardGrowthError(battle);
  if (incompleteGrowth) throw incompleteGrowth;
  const incompleteReplacement = incompleteReplacementError(battle);
  if (incompleteReplacement) throw incompleteReplacement;

  const resolvedCommandKind = resolveCommandKindForCommit(battle, result, commandKind);
  if (battle.phase === SAFARI_BATTLE_PHASE.RESULT && battle.completed) {
    const replayed = replayCommittedResolution(battle, result, resolvedCommandKind);
    if (!replayed) {
      throw new Error("RESULT battle resolution replay requires committed command identity");
    }
    return replayed;
  }

  const decision = Number(result?.decision ?? battle.decision ?? 0);
  const playerReplacementRequired = Boolean(result?.playerReplacementRequired ?? battle.player_replacement_required);
  const foeReplacementRequired = Boolean(result?.foeReplacementRequired);
  const playerReplacementApplied = Boolean(result?.playerReplacementApplied);
  const foeReplacementApplied = Boolean(result?.foeReplacementApplied);
  if (playerReplacementApplied && !playerReplacementRequired) {
    throw new Error("pre-applied player replacement is not accepted; commit it through central REPLACEMENT");
  }
  if (foeReplacementApplied && !foeReplacementRequired) {
    throw new Error("pre-applied foe replacement is not accepted; commit it through central REPLACEMENT");
  }
  if (battle.completed) {
    throw new Error("pre-RESULT battle completion is not accepted; RESULT is the only completion boundary");
  }

  const replayed = replayCommittedResolution(battle, result, resolvedCommandKind);
  if (replayed) return replayed;

  if (battle.phase !== SAFARI_BATTLE_PHASE.ACTION_1) {
    throw new Error(`fresh battle resolution requires ACTION_1; got ${battle.phase}`);
  }
  requirePendingCommandProvenance(battle, resolvedCommandKind);
  if (battle.pending_command_attempt_required === true || commandAttempt != null) {
    validateCommandAttempt(battle, commandAttempt, resolvedCommandKind);
  }

  if (result?.turnConsumed === false) {
    validateResolutionAgainstPendingCommand(battle, result);
    return rejectUnconsumedCommand(battle, result, resolvedCommandKind);
  }
  bindResolutionToPendingCommand(battle, result);

  const resolutionCheckpoint = beginResolutionCheckpoint(battle, resolvedCommandKind);
  const terminalResolution = decision !== 0;
  const actors = materializeActionOrder(battle, result, resolvedCommandKind);
  const consumedAction = commandConsumesAction(resolvedCommandKind);
  const firstActionActor = consumedAction ? "player" : (actors[0] ?? null);
  const secondActionActor = consumedAction ? (actors[0] ?? null) : (actors[1] ?? null);
  const secondActionOccurred = secondActionActor != null;
  tracePhase(battle, SAFARI_BATTLE_PHASE.CHECK_1, "first action resolved", { actor: firstActionActor });
  if (secondActionOccurred) {
    tracePhase(battle, SAFARI_BATTLE_PHASE.ACTION_2, `second action:${secondActionActor}`, { actor: secondActionActor });
    tracePhase(battle, SAFARI_BATTLE_PHASE.CHECK_2, "second action checked", { actor: secondActionActor });
  }

  const fainted = hasFaint(result) || playerReplacementRequired || foeReplacementRequired || terminalResolution;
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
    resumeCommandAfterResolution(battle, "replacement presentation pending");
  } else {
    resumeCommandAfterResolution(battle, `round presentation pending:${resolvedCommandKind}`);
  }

  if (result && typeof result === "object") {
    result.orchestratorBattleInstanceSequence = resolutionCheckpoint.battleInstanceSequence;
    result.orchestratorCommandSequence = resolutionCheckpoint.sequence;
  }
  resolutionCheckpoint.phase = battle.phase;
  battle.pending_command_kind = null;
  battle.pending_command_sequence = null;
  clearPendingCommandAttempt(battle);
  if (requestsPersistence(result)) result.persistenceRequested = true;
  result.phase = battle.phase;
  result.phaseTrace = structuredClone(battle.phase_trace ?? []);
  resolutionCheckpoint.committedResult = structuredClone(result);
  resolutionCheckpoint.committed = true;
  return result;
}

function completeSafariBattlePresentationCheckpoint(runtime) {
  const battle = stateOf(runtime).battle;
  if (!battle) return null;
  const checkpoint = battle.presentation_checkpoint;
  if (!checkpoint) return battle.phase;
  if (checkpoint.committed === true) return battle.phase;
  if (battle.completed || battle.phase === SAFARI_BATTLE_PHASE.RESULT || battle.phase === SAFARI_BATTLE_PHASE.RETURN) {
    throw new Error(`battle presentation completion is unavailable during ${battle.phase}`);
  }
  if (Number(checkpoint.sequence) !== Number(battle.command_sequence ?? 0)) {
    throw new Error("battle presentation checkpoint belongs to a different command");
  }
  if (battle.phase !== checkpoint.phase) {
    throw new Error(`battle presentation checkpoint expected ${checkpoint.phase}, got ${battle.phase}`);
  }
  checkpoint.committed = true;
  return tracePhase(battle, SAFARI_BATTLE_PHASE.COMMAND, `presentation completed:${checkpoint.reason ?? "round"}`);
}

export function captureSafariBattlePresentationAckSequence(runtime) {
  const battle = stateOf(runtime).battle;
  const checkpoint = battle?.presentation_checkpoint;
  if (!checkpoint || checkpoint.committed === true) return null;
  const sequence = Number(checkpoint.sequence);
  if (!Number.isInteger(sequence) || sequence < 0) {
    throw new Error("battle presentation checkpoint has invalid command sequence");
  }
  const token = Object.freeze({ battle, checkpoint, sequence });
  issuedPresentationAckTokens.add(token);
  return token;
}

export function completeSafariBattlePresentationForSequence(runtime, expectedSequence) {
  const battle = stateOf(runtime).battle;
  if (!battle) return null;
  if (!expectedSequence || typeof expectedSequence !== "object") {
    throw new Error("battle presentation acknowledgement requires a captured command sequence token");
  }
  if (!issuedPresentationAckTokens.has(expectedSequence)) {
    throw new Error("battle presentation acknowledgement requires a token issued by the central orchestrator");
  }
  if (expectedSequence.battle !== battle) {
    throw new Error("stale battle presentation acknowledgement belongs to a different battle instance");
  }
  const sequence = Number(expectedSequence.sequence);
  if (!Number.isInteger(sequence) || sequence < 0) {
    throw new Error("battle presentation acknowledgement requires a captured command sequence token");
  }
  const checkpoint = battle.presentation_checkpoint;
  if (!checkpoint || expectedSequence.checkpoint !== checkpoint) {
    throw new Error("stale battle presentation acknowledgement belongs to a different presentation checkpoint");
  }
  if (Number(checkpoint.sequence) !== sequence) {
    throw new Error(
      `stale battle presentation acknowledgement belongs to command sequence ${sequence}; current presentation sequence is ${checkpoint.sequence}`,
    );
  }
  return completeSafariBattlePresentationCheckpoint(runtime);
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
  resumeCommandAfterResolution(battle, "player replacement presentation pending");
  result.phase = battle.phase;
  result.phaseTrace = structuredClone(battle.phase_trace ?? []);
  const resolutionCheckpoint = battle.resolution_checkpoint;
  if (resolutionCheckpoint?.committed === true) {
    if (Number(resolutionCheckpoint.sequence) !== Number(battle.command_sequence ?? 0)) {
      throw new Error("player replacement completion belongs to a different resolution checkpoint");
    }
    if (result && typeof result === "object") {
      result.orchestratorBattleInstanceSequence = resolutionCheckpoint.battleInstanceSequence;
      result.orchestratorCommandSequence = resolutionCheckpoint.sequence;
    }
    resolutionCheckpoint.phase = battle.phase;
    resolutionCheckpoint.committedResult = structuredClone(result);
  }
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
  if (battle) {
    throw new Error("battle return completion requires the active battle to be cleared");
  }
  if (committedCheckpoint?.committed === true) {
    result.operations = structuredClone(committedCheckpoint.operations ?? []);
    result.persistenceRequested = true;
    state.last_operations = structuredClone(committedCheckpoint.operations ?? []);
    result.phase = SAFARI_BATTLE_PHASE.RETURN;
    result.phaseTrace = structuredClone(committedCheckpoint.phaseTrace ?? state.last_battle_phase_trace ?? []);
    return result;
  }

  const pendingCheckpoint = state.pending_battle_return_checkpoint;
  if (!pendingCheckpoint || pendingCheckpoint.committed !== false || pendingCheckpoint.phaseTrace?.at(-1)?.phase !== SAFARI_BATTLE_PHASE.RETURN) {
    throw new Error("battle return completion requires beginSafariBattleReturn from RESULT");
  }
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
