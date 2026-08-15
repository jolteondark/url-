function num(value, fallback = 0) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

export function resolveUseMoveDancerCanonical(action = {}) {
  const resolved = structuredClone(action ?? {});
  const input = resolved.dancerInput;
  if (resolved.kind !== "move" || !input) return resolved;

  const operations = [];
  const move = structuredClone(input.move ?? {});
  let decision = num(input.initialDecision, 0);
  let terminated = false;
  const guardPasses = input.userDancerEffect !== true &&
    input.userLastMoveFailed !== true && num(input.realNumHits, 0) > 0 &&
    move.snatched !== true && num(input.magicCoater, -1) < 0 &&
    input.globalDancerActive === true && move.danceMove === true;

  const priorityBattlers = Array.isArray(input.priorityBattlers)
    ? input.priorityBattlers.map((b) => structuredClone(b)) : [];
  if (!guardPasses) {
    resolved.dancerResolution = { reason: "not_triggered", operations, battlers: priorityBattlers, decision, terminated };
    return resolved;
  }

  const dancers = priorityBattlers.filter((b) => num(b.index, -1) !== num(input.userIndex, -1) && b.activeDancer === true);
  while (dancers.length > 0) {
    const battler = dancers.pop();
    const battlerIndex = num(battler.index, -1);
    const oldLastRoundMoved = num(battler.lastRoundMoved, 0);
    const oldOutrage = num(battler.outrage, 0);
    const oldCurrentMove = battler.currentMove ?? null;
    if (oldOutrage > 0) {
      battler.outrage = oldOutrage + 1;
      operations.push({ op: "increment_outrage_for_dancer", battlerIndex, value: battler.outrage });
    }

    let preTarget = num(input.choiceTargetIndex, -1);
    if (battler.opposesUser === true || battler.opposesPreTarget !== true) preTarget = num(input.userIndex, -1);

    operations.push({ op: "show_ability_splash", battlerIndex, forced: true });
    operations.push({ op: "hide_ability_splash", battlerIndex });
    if (input.useAbilitySplash !== true) operations.push({ op: "display_dancer_message", battlerIndex });
    battler.dancer = true;
    operations.push({ op: "set_dancer", battlerIndex, active: true });

    if (battler.canChooseMove === true) {
      operations.push({ op: "use_move_simple_request", battlerIndex, moveId: move.id ?? null, targetIndex: preTarget });
      battler.lastRoundMoved = oldLastRoundMoved;
      battler.outrage = oldOutrage;
      battler.currentMove = oldCurrentMove;
      operations.push({ op: "restore_last_round_moved", battlerIndex, value: oldLastRoundMoved });
      operations.push({ op: "restore_outrage", battlerIndex, value: oldOutrage });
      operations.push({ op: "restore_current_move", battlerIndex, value: oldCurrentMove });
      decision = num(battler.judgeDecision, decision);
      operations.push({ op: "judge", battlerIndex, decision });
      if (decision > 0) {
        terminated = true;
        break;
      }
    }

    battler.dancer = false;
    operations.push({ op: "set_dancer", battlerIndex, active: false });
  }

  resolved.dancerResolution = { reason: terminated ? "battle_decided" : "complete", operations, battlers: priorityBattlers, decision, terminated };
  return resolved;
}
