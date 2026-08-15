function num(value, fallback = 0) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

export function resolveUseMoveInstructCanonical(action = {}) {
  const resolved = structuredClone(action ?? {});
  const input = resolved.instructInput;
  if (resolved.kind !== "move" || !input) return resolved;

  const operations = [];
  const battlers = Array.isArray(input.battlers) ? input.battlers.map((b) => structuredClone(b)) : [];
  let terminated = false;
  let decision = num(input.initialDecision, 0);

  for (const battler of battlers) {
    const battlerIndex = num(battler.index, -1);
    if (!battler.instruct || !battler.lastMoveUsed) continue;
    battler.instruct = false;
    operations.push({ op: "set_instruct", battlerIndex, active: false });

    const moves = Array.isArray(battler.moves) ? battler.moves : [];
    let moveIndex = -1;
    for (let i = 0; i < moves.length; i += 1) {
      const moveId = typeof moves[i] === "object" && moves[i] !== null ? moves[i].id : moves[i];
      if (moveId === battler.lastMoveUsed) moveIndex = i;
    }
    if (moveIndex < 0) continue;

    const oldLastRoundMoved = num(battler.lastRoundMoved, 0);
    operations.push({ op: "display_instructed_move", battlerIndex, userIndex: num(input.userIndex, -1), moveId: battler.lastMoveUsed });
    battler.instructed = true;
    operations.push({ op: "set_instructed", battlerIndex, active: true });

    if (battler.canChooseMove === true) {
      operations.push({ op: "use_move_simple_request", battlerIndex, moveId: battler.lastMoveUsed, targetIndex: num(battler.lastRegularMoveTarget, -1), moveIndex, specialUsage: false });
      battler.lastRoundMoved = oldLastRoundMoved;
      operations.push({ op: "restore_last_round_moved", battlerIndex, value: oldLastRoundMoved });
      decision = num(battler.judgeDecision, decision);
      operations.push({ op: "judge", battlerIndex, decision });
      if (decision > 0) {
        terminated = true;
        break;
      }
    }

    battler.instructed = false;
    operations.push({ op: "set_instructed", battlerIndex, active: false });
  }

  resolved.instructResolution = { reason: terminated ? "battle_decided" : "complete", operations, battlers, decision, terminated };
  return resolved;
}
