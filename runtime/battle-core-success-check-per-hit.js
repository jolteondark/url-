import { accuracyCheckCanonical } from "./battle-core-accuracy-damage.js";

function num(value, fallback = 0) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

export function successCheckPerHitCanonical(input = {}) {
  const targetIndex = num(input.targetIndex, -1);
  if (Boolean(input.userTwoTurnAttack)) return { success: true, reason: "user_two_turn_attack", invulnerable: false };
  if (num(input.lockOnTurns, 0) > 0 && num(input.lockOnPos, -1) === targetIndex) {
    return { success: true, reason: "lock_on", invulnerable: false };
  }
  if (Boolean(input.overrideSuccessCheckPerHit)) return { success: true, reason: "move_override", invulnerable: false };

  const hitsInvulnerable = Boolean(input.userNoGuard) || Boolean(input.targetNoGuard) ||
    Boolean(input.futureSight) || input.functionCode === "PowerUpAllyMove";
  let miss = false;
  if (!hitsInvulnerable) {
    const twoTurnKind = input.targetTwoTurnAttackKind ?? null;
    if (twoTurnKind === "sky") miss = !Boolean(input.hitsFlyingTargets);
    else if (twoTurnKind === "underground") miss = !Boolean(input.hitsDiggingTargets);
    else if (twoTurnKind === "underwater") miss = !Boolean(input.hitsDivingTargets);
    else if (twoTurnKind === "remove_protections") miss = true;

    if (num(input.targetSkyDropUserIndex, -1) >= 0 &&
        num(input.targetSkyDropUserIndex, -1) !== num(input.userIndex, -1) &&
        !Boolean(input.hitsFlyingTargets)) miss = true;
  }
  if (miss) return { success: false, reason: "semi_invulnerable", invulnerable: true };
  if (Boolean(input.skipAccuracyCheck)) return { success: true, reason: "skip_accuracy", invulnerable: false };

  const accuracy = accuracyCheckCanonical(input.accuracyInput ?? {});
  if (accuracy.hit) return { success: true, reason: "accuracy_hit", invulnerable: false, accuracyResolution: accuracy };
  return { success: false, reason: "accuracy_miss", invulnerable: false, accuracyResolution: accuracy };
}
