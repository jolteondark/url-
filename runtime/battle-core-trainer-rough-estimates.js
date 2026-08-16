const STAT_STAGE_MAXIMUM = 6;
const ACC_EVA_STAGE_MULTIPLIERS = [3, 3, 3, 3, 3, 3, 3, 4, 5, 6, 7, 8, 9];
const ACC_EVA_STAGE_DIVISORS = [9, 8, 7, 6, 5, 4, 3, 3, 3, 3, 3, 3, 3];

function finite(value, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
function clampStage(stage) {
  return Math.max(-STAT_STAGE_MAXIMUM, Math.min(STAT_STAGE_MAXIMUM, Math.trunc(finite(stage))));
}

export function estimateTrainerRoughAccuracy(input = {}) {
  const baseAccuracy = finite(input.baseAccuracy);
  if (input.ohko === true) {
    let result = baseAccuracy + Math.trunc(finite(input.userLevel)) - Math.trunc(finite(input.targetLevel));
    if (input.ohkoIce === true && input.userHasIceType !== true) result -= 10;
    return Math.max(result, 0);
  }
  if (input.mediumSkill === true && (input.telekinesis === true || (input.minimized === true && input.tramplesMinimize === true && finite(input.mechanicsGeneration, 9) >= 6))) return 100;
  if (baseAccuracy === 0) return 100;
  const resolvedBase = input.resolvedBaseAccuracy == null ? baseAccuracy : finite(input.resolvedBaseAccuracy, baseAccuracy);
  if (resolvedBase < 0) return 0;
  if (resolvedBase === 0) return 100;
  const accStage = clampStage(input.accuracyStage) + STAT_STAGE_MAXIMUM;
  const evaStage = clampStage(input.evasionStage) + STAT_STAGE_MAXIMUM;
  const accMultiplier = finite(input.accuracyMultiplier, 1);
  const evaMultiplier = finite(input.evasionMultiplier, 1);
  const accuracy = Math.round((100 * ACC_EVA_STAGE_MULTIPLIERS[accStage] / ACC_EVA_STAGE_DIVISORS[accStage]) * accMultiplier);
  let evasion = Math.round((100 * ACC_EVA_STAGE_MULTIPLIERS[evaStage] / ACC_EVA_STAGE_DIVISORS[evaStage]) * evaMultiplier);
  if (evasion < 1) evasion = 1;
  return resolvedBase * accuracy / evasion;
}

export function estimateTrainerRoughDamage(input = {}) {
  const basePower = Math.max(1, Math.round(finite(input.basePower, 1) * finite(input.powerMultiplier, 1)));
  if (input.fixedDamage === true) return Math.trunc(finite(input.fixedDamageValue, basePower));
  const attack = Math.max(1, Math.round(finite(input.attack, 1) * finite(input.attackMultiplier, 1)));
  const defense = Math.max(1, Math.round(finite(input.defense, 1) * finite(input.defenseMultiplier, 1)));
  const level = Math.trunc(finite(input.userLevel, 1));
  let damage = Math.floor((Math.floor(((Math.floor((2 * level / 5) + 2) * basePower * attack) / defense)) / 50)) + 2;
  damage = Math.max(1, Math.round(damage * finite(input.finalDamageMultiplier, 1)));
  if (input.nonLethal === true && Number.isFinite(input.targetHp) && damage >= input.targetHp) damage = input.targetHp - 1;
  return Math.floor(damage);
}

export function buildTrainerRoughEstimates(input = {}) {
  return {
    roughAccuracy: estimateTrainerRoughAccuracy(input.accuracy || {}),
    roughDamage: estimateTrainerRoughDamage(input.damage || {}),
  };
}
