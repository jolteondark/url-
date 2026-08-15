function num(v, f = 0) {
  const n = Number(v ?? f);
  return Number.isFinite(n) ? n : f;
}

export function resolveUseMovePostHitCanonical(action = {}) {
  const resolved = structuredClone(action ?? {});
  const input = resolved.postHitInput;
  if (resolved.kind !== "move" || !input) return resolved;

  const operations = [];
  const targets = Array.isArray(input.targets)
    ? input.targets.map((target) => ({ ...target, index: num(target.index, -1) }))
    : [];
  const realNumHits = num(resolved.realNumHits ?? input.realNumHits, 0);
  const numHits = num(resolved.numHits ?? input.numHits, 1);

  operations.push({ op: "set_success_use_state", useState: 2 });
  let typeMod = 0;
  for (const target of targets) {
    if (!target.unaffected) typeMod += num(target.typeMod, 0);
  }
  if (targets.length > 0) operations.push({ op: "set_success_type_mod", typeMod });

  if (numHits > 1) {
    if (Boolean(input.damagingMove)) {
      for (const target of targets) {
        if (!target.unaffected && !target.substitute) {
          operations.push({ op: "effectiveness_message", targetIndex: target.index, targetCount: targets.length });
        }
      }
    }
    if (realNumHits === 1) operations.push({ op: "display_hit_count", count: 1 });
    else if (realNumHits > 1) operations.push({ op: "display_hit_count", count: realNumHits });
  }

  for (const target of targets) {
    if (target.fainted || (!target.magicCoat && !target.magicBounce)) continue;
    if (target.magicBounce) operations.push({ op: "show_bounce_ability", battlerIndex: target.index });
    operations.push({ op: "display_bounced", battlerIndex: target.index });
    if (target.magicBounce) operations.push({ op: "hide_bounce_ability", battlerIndex: target.index });
    const bounce = target.bounceResult ?? {};
    const targetIndexes = Array.isArray(bounce.targetIndexes) ? bounce.targetIndexes.map((v) => num(v, -1)) : [];
    const success = bounce.moveFailed !== true && bounce.success !== false;
    operations.push({ op: "resolve_bounce_targets", battlerIndex: target.index, targetIndexes });
    if (success) {
      operations.push({ op: "process_move_hit_request", userIndex: target.index, targetIndexes, hit: 0, skipAccuracyCheck: false });
    } else {
      operations.push({ op: "set_last_move_failed", battlerIndex: target.index, value: true });
    }
    operations.push({ op: "faint_targets_request", targetIndexes: targets.filter((other) => other.fainted).map((other) => other.index) });
    if (Boolean(input.userFainted)) operations.push({ op: "faint_user_request" });
  }

  const magicCoater = num(input.magicCoaterIndex, -1);
  const magicBouncer = num(input.magicBouncerIndex, -1);
  if (magicCoater >= 0 || magicBouncer >= 0) {
    const battlerIndex = magicCoater >= 0 ? magicCoater : magicBouncer;
    const bounce = input.noTargetBounce ?? {};
    if (!Boolean(bounce.fainted)) {
      resolved.userLastMoveFailed = true;
      if (magicBouncer >= 0) operations.push({ op: "show_bounce_ability", battlerIndex });
      operations.push({ op: "display_bounced", battlerIndex });
      if (magicBouncer >= 0) operations.push({ op: "hide_bounce_ability", battlerIndex });
      const success = bounce.moveFailed !== true && bounce.success !== false;
      if (success) {
        operations.push({ op: "process_move_hit_request", userIndex: battlerIndex, targetIndexes: [], hit: 0, skipAccuracyCheck: false });
      } else {
        operations.push({ op: "set_last_move_failed", battlerIndex, value: true });
      }
      operations.push({ op: "faint_targets_request", targetIndexes: targets.filter((target) => target.fainted).map((target) => target.index) });
      if (Boolean(input.userFainted)) operations.push({ op: "faint_user_request" });
    }
  }

  for (const target of targets) operations.push({ op: "effect_after_all_hits_request", targetIndex: target.index });
  operations.push({ op: "faint_targets_request", targetIndexes: targets.filter((target) => target.fainted).map((target) => target.index) });
  if (Boolean(input.userFainted)) operations.push({ op: "faint_user_request" });
  operations.push({ op: "effects_after_move_request", targetIndexes: targets.map((target) => target.index), realNumHits });
  operations.push({ op: "reset_battler_round_flags" });

  resolved.moldBreaker = false;
  operations.push({ op: "set_mold_breaker", active: false });
  operations.push({ op: "gain_exp_request" });
  operations.push({ op: "update_battle_arena_skills_request" });
  if (input.choiceKind !== "None") operations.push({ op: "hyper_mode_request" });
  operations.push({ op: "end_turn" });

  resolved.postHitResolution = { reason: "complete", operations, realNumHits, numHits, typeMod };
  return resolved;
}
