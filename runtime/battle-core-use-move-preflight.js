function num(value, fallback = 0) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

export function resolveUseMovePreflightCanonical(action = {}) {
  const resolved = structuredClone(action ?? {});
  if (resolved.kind !== "move" || !resolved.useMoveInput) return resolved;

  const input = resolved.useMoveInput ?? {};
  const operations = [];
  let specialUsage = Boolean(input.specialUsage ?? resolved.specialUsage ?? false);
  let moveIndex = num(input.moveIndex ?? resolved.moveIndex, -1);
  let moveId = input.moveId ?? resolved.moveId ?? null;
  let targetIndex = num(input.targetIndex ?? resolved.targetIndex, -1);
  let movePresent = input.movePresent === undefined ? moveId !== null : Boolean(input.movePresent);
  let lastMoveFailed = false;
  let userLastMoveFailed = false;

  const finish = (reason, skipped = true) => {
    resolved.moveIndex = moveIndex;
    resolved.moveId = moveId;
    resolved.targetIndex = targetIndex;
    resolved.specialUsage = specialUsage;
    resolved.skipAccuracyCheck = Boolean(specialUsage && !Boolean(input.isStruggle));
    resolved.moveSkipped = skipped;
    resolved.lastMoveFailed = lastMoveFailed;
    resolved.userLastMoveFailed = userLastMoveFailed;
    resolved.moveUseResolution = { reason, operations, specialUsage, moveIndex, moveId, targetIndex };
    return resolved;
  };

  operations.push({ op: "begin_turn" });
  if (!Boolean(input.futureSight)) {
    if (Boolean(input.usingMultiTurnAttack)) {
      moveId = input.currentMoveId ?? moveId;
      movePresent = input.currentMovePresent === undefined ? moveId !== null : Boolean(input.currentMovePresent);
      specialUsage = true;
      operations.push({ op: "force_multi_turn_move", moveId });
    } else if (num(input.encoreTurns, 0) > 0 && moveIndex >= 0 && Boolean(input.canShowCommands)) {
      const encoredMoveIndex = num(input.encoredMoveIndex, -1);
      if (encoredMoveIndex >= 0 && moveIndex !== encoredMoveIndex && Boolean(input.encoreCanChoose)) {
        moveIndex = encoredMoveIndex;
        moveId = input.encoredMoveId ?? moveId;
        targetIndex = -1;
        movePresent = input.encoredMovePresent === undefined ? moveId !== null : Boolean(input.encoredMovePresent);
        operations.push({ op: "force_encore_move", moveIndex, moveId, targetIndex: -1 });
      }
    }
  }
  if (!movePresent) return finish("no_move");

  lastMoveFailed = false;
  operations.push({ op: "try_use_move", success: input.tryUseMoveSuccess !== false });
  if (input.tryUseMoveSuccess === false) {
    operations.push({ op: "reset_last_move_usage", regular: !specialUsage });
    operations.push({ op: "gain_exp_request", reason: "try_use_move_failed" });
    operations.push({ op: "cancel_moves" });
    operations.push({ op: "end_turn" });
    return finish("try_use_move_failed");
  }

  if (input.afterTryMoveId !== undefined) moveId = input.afterTryMoveId;
  if (input.afterTryMoveIndex !== undefined) moveIndex = num(input.afterTryMoveIndex, moveIndex);
  if (input.afterTryTargetIndex !== undefined) targetIndex = num(input.afterTryTargetIndex, targetIndex);
  if (input.afterTryMovePresent !== undefined) movePresent = Boolean(input.afterTryMovePresent);
  if (!movePresent) return finish("no_move_after_try");

  if (!specialUsage) {
    const ppOk = input.ppReduceSuccess !== false;
    operations.push({ op: "reduce_pp_request", reason: "move_use", success: ppOk });
    if (!ppOk) {
      operations.push({ op: "display_use_message", moveId });
      operations.push({ op: "display_no_pp" });
      operations.push({ op: "reset_last_move_usage", regular: true });
      lastMoveFailed = true;
      operations.push({ op: "cancel_moves" });
      operations.push({ op: "end_turn" });
      return finish("no_pp");
    }
  }

  if (Boolean(input.isAegislash) && Boolean(input.stanceChangeActive)) {
    if (Boolean(input.damagingMove)) operations.push({ op: "change_form", form: 1, reason: "stance_change" });
    else if (moveId === "KINGSSHIELD") operations.push({ op: "change_form", form: 0, reason: "stance_change" });
  }

  const calcType = input.calculatedType ?? resolved.calculatedType ?? null;
  resolved.calculatedType = calcType;
  operations.push({ op: "calc_move_type", type: calcType });
  resolved.moldBreaker = Boolean(input.hasMoldBreaker);
  operations.push({ op: "set_mold_breaker", active: resolved.moldBreaker });

  if (Boolean(input.chargingTurn)) {
    resolved.twoTurnAttack = moveId;
    resolved.currentMoveId = moveId;
    operations.push({ op: "set_two_turn_attack", moveId });
  } else {
    resolved.twoTurnAttack = null;
    operations.push({ op: "clear_two_turn_attack" });
  }
  operations.push({ op: "change_usage_counters", specialUsage });

  let metronomeCount = num(input.metronomeCount, 0);
  if (Boolean(input.metronomeActive) && !Boolean(input.callsAnotherMove)) {
    if (input.previousLastMoveUsed && input.previousLastMoveUsed === moveId && !Boolean(input.previousLastMoveFailed)) metronomeCount += 1;
    else metronomeCount = 0;
    operations.push({ op: "set_metronome_count", count: metronomeCount });
  }

  const movesUsed = Array.isArray(input.movesUsed) ? [...input.movesUsed] : [];
  if (!specialUsage && moveId !== null && !movesUsed.includes(moveId)) movesUsed.push(moveId);
  resolved.moveUseState = {
    lastMoveUsed: moveId,
    lastMoveUsedType: calcType,
    lastRegularMoveUsed: specialUsage ? (input.previousLastRegularMoveUsed ?? null) : moveId,
    lastRegularMoveTarget: specialUsage ? num(input.previousLastRegularMoveTarget, -1) : targetIndex,
    movesUsed,
    battleLastMoveUsed: moveId,
    battleLastMoveUser: num(resolved.battlerIndex, -1),
    successUseState: 1,
    metronomeCount,
  };
  operations.push({ op: "record_move_usage", moveId, specialUsage });

  const userIndex = num(input.resolvedUserIndex, num(resolved.battlerIndex, -1));
  const targetIndexes = Array.isArray(input.resolvedTargetIndexes)
    ? input.resolvedTargetIndexes.map((v) => num(v, -1))
    : (targetIndex >= 0 ? [targetIndex] : []);
  resolved.resolvedUserIndex = userIndex;
  resolved.resolvedTargetIndexes = targetIndexes;
  operations.push({ op: "resolve_user_targets", userIndex, targetIndexes });

  if (!specialUsage) {
    const pressureReductions = Math.max(0, num(input.pressurePpReductions, 0));
    for (let i = 0; i < pressureReductions; i += 1) operations.push({ op: "reduce_pp_request", reason: "pressure" });
  }

  if (Boolean(input.moveBlockedByPriority)) {
    operations.push({ op: "display_brief_use", userIndex, moveId });
    operations.push({ op: "show_blocking_ability", battlerIndex: num(input.blockerIndex, -1) });
    operations.push({ op: "display_move_blocked", userIndex, moveId });
    operations.push({ op: "hide_blocking_ability", battlerIndex: num(input.blockerIndex, -1) });
    userLastMoveFailed = true;
    operations.push({ op: "cancel_moves" });
    operations.push({ op: "end_turn" });
    return finish("priority_blocked");
  }

  operations.push({ op: "display_use_message", originalUserIndex: num(resolved.battlerIndex, -1), moveId });
  if (Boolean(input.snatched)) {
    lastMoveFailed = true;
    operations.push({ op: "display_snatched", userIndex });
  }

  if (Boolean(input.moveFailed)) {
    userLastMoveFailed = true;
    operations.push({ op: "move_failed", functionCode: input.functionCode ?? null });
    operations.push({ op: "cancel_moves" });
    operations.push({ op: "end_turn" });
    return finish("move_failed");
  }

  operations.push({ op: "on_start_use", userIndex, targetIndexes });
  return finish("ready_for_effects", false);
}
