import { successCheckPerHitCanonical } from "./battle-core-success-check-per-hit.js";

function num(v, f = 0) {
  const n = Number(v ?? f);
  return Number.isFinite(n) ? n : f;
}

export function resolveProcessMoveHitPreludeCanonical(input = {}) {
  const state = structuredClone(input ?? {});
  const operations = [];
  const hitNum = num(state.hitNum, 0);
  const originalTargets = Array.isArray(state.targets) ? state.targets.map((t) => ({
    ...t,
    index: num(t.index, -1),
    missed: Boolean(t.missed),
    unaffected: Boolean(t.unaffected),
    magicCoat: Boolean(t.magicCoat),
  })) : [];

  if (Boolean(state.userFainted)) {
    return { proceed: false, reason: "user_fainted", operations, parentalBond: num(state.parentalBond, 0), allTargets: originalTargets, targets: originalTargets };
  }

  operations.push({ op: "initial_effect_request", hitNum });
  let parentalBond = num(state.parentalBond, 0);
  if (parentalBond > 0) {
    parentalBond -= 1;
    operations.push({ op: "decrement_parental_bond", value: parentalBond });
  }

  if (hitNum === 0 || Boolean(state.successCheckPerHit)) {
    let numTargets = 0;
    for (const target of originalTargets) {
      target.missed = false;
      operations.push({ op: "reset_missed", targetIndex: target.index });
      if (target.unaffected) continue;
      let success = target.perHitSuccess !== false;
      if (target.perHitSuccessCheckInput) {
        const perHit = successCheckPerHitCanonical({
          ...target.perHitSuccessCheckInput,
          targetIndex: target.index,
          skipAccuracyCheck: target.perHitSuccessCheckInput.skipAccuracyCheck ?? Boolean(state.skipAccuracyCheck),
        });
        target.perHitSuccessResolution = perHit;
        target.invulnerable = perHit.invulnerable;
        success = perHit.success;
      }
      operations.push({ op: "success_check_per_hit", targetIndex: target.index, success, skipAccuracyCheck: Boolean(state.skipAccuracyCheck) });
      if (success) numTargets += 1;
      else {
        target.missed = true;
        target.unaffected = true;
      }
    }
    if (originalTargets.length > 0 && numTargets === 0 && !Boolean(state.worksWithNoTargets)) {
      for (const target of originalTargets) {
        if (!target.missed || target.magicCoat) continue;
        operations.push({ op: "miss_message_request", targetIndex: target.index });
        if (Boolean(state.userItemActive)) operations.push({ op: "missing_target_item_effect_request", targetIndex: target.index, hitNum });
        if (Boolean(state.repeatHit)) break;
      }
      operations.push({ op: "crash_damage_request" });
      operations.push({ op: "item_hp_heal_check_request", user: true });
      operations.push({ op: "cancel_moves_request" });
      return { proceed: false, reason: "all_targets_failed", operations, parentalBond, allTargets: originalTargets, targets: originalTargets };
    }
  }

  const designatedIndexes = Array.isArray(state.designatedTargetIndexes)
    ? state.designatedTargetIndexes.map((v) => num(v, -1))
    : originalTargets.map((t) => t.index);
  const designated = designatedIndexes.map((idx) => originalTargets.find((t) => t.index === idx)).filter(Boolean);
  operations.push({ op: "designate_targets_for_hit", hitNum, targetIndexes: designated.map((t) => t.index) });
  for (const target of designated) operations.push({ op: "reset_per_hit", targetIndex: target.index });

  if (Boolean(state.damagingMove)) {
    for (const target of designated) {
      if (target.unaffected) continue;
      operations.push({ op: "check_damage_absorption_request", targetIndex: target.index });
      operations.push({ op: "calc_damage_request", targetIndex: target.index, targetCount: designated.length });
      operations.push({ op: "reduce_damage_request", targetIndex: target.index });
    }
  }

  return { proceed: true, reason: "damage_prepared", operations, parentalBond, allTargets: originalTargets, targets: designated };
}
