const STAT_STAGE_MAXIMUM = 6;
const STAT_STAGE_MULTIPLIERS = [2, 2, 2, 2, 2, 2, 2, 3, 4, 5, 6, 7, 8];
const STAT_STAGE_DIVISORS = [8, 7, 6, 5, 4, 3, 2, 2, 2, 2, 2, 2, 2];
const ACC_EVA_STAGE_MULTIPLIERS = [3, 3, 3, 3, 3, 3, 3, 4, 5, 6, 7, 8, 9];
const ACC_EVA_STAGE_DIVISORS = [9, 8, 7, 6, 5, 4, 3, 3, 3, 3, 3, 3, 3];

function rubyRound(value) {
  const n = Number(value ?? 0);
  return n >= 0 ? Math.floor(n + 0.5) : Math.ceil(n - 0.5);
}

function clampStage(stage) {
  return Math.max(-STAT_STAGE_MAXIMUM, Math.min(STAT_STAGE_MAXIMUM, Number(stage ?? 0)));
}

export function accuracyCheckCanonical(input = {}) {
  if (Number(input.telekinesisTurns ?? 0) > 0) {
    return { hit: true, alwaysHitReason: "telekinesis", affectionMissed: false };
  }
  if (Boolean(input.minimized) && Boolean(input.tramplesMinimize) && Number(input.mechanicsGeneration ?? 0) >= 6) {
    return { hit: true, alwaysHitReason: "minimize", affectionMissed: false };
  }
  const baseAccuracy = Number(input.baseAccuracy ?? 0);
  if (baseAccuracy === 0) {
    return { hit: true, alwaysHitReason: "base_accuracy_zero", affectionMissed: false };
  }
  const modifiedBaseAccuracy = Number(input.modifiedBaseAccuracy ?? baseAccuracy);
  if (modifiedBaseAccuracy === 0) {
    return { hit: true, alwaysHitReason: "modified_base_accuracy_zero", affectionMissed: false };
  }

  const accStage = clampStage(input.modifiedAccuracyStage ?? input.accuracyStage ?? 0) + STAT_STAGE_MAXIMUM;
  const evaStage = clampStage(input.modifiedEvasionStage ?? input.evasionStage ?? 0) + STAT_STAGE_MAXIMUM;
  let accuracy = 100.0 * ACC_EVA_STAGE_MULTIPLIERS[accStage] / ACC_EVA_STAGE_DIVISORS[accStage];
  let evasion = 100.0 * ACC_EVA_STAGE_MULTIPLIERS[evaStage] / ACC_EVA_STAGE_DIVISORS[evaStage];
  accuracy = rubyRound(accuracy * Number(input.accuracyMultiplier ?? 1));
  evasion = rubyRound(evasion * Number(input.evasionMultiplier ?? 1));
  if (evasion < 1) evasion = 1;
  const threshold = modifiedBaseAccuracy * accuracy / evasion;
  const randomRoll = Number(input.randomRoll ?? 0);

  const affection = Boolean(input.affectionEffects) && Boolean(input.internalBattle) &&
    Boolean(input.targetOwnedByPlayer) && Number(input.targetAffectionLevel ?? 0) === 5 &&
    !Boolean(input.targetMega);
  if (affection) {
    if (randomRoll < threshold - 10) return { hit: true, threshold, randomRoll, affectionMissed: false };
    if (randomRoll < threshold) return { hit: false, threshold, randomRoll, affectionMissed: true };
  }
  return { hit: randomRoll < threshold, threshold, randomRoll, affectionMissed: false };
}

export function calcDamageCanonical(input = {}) {
  if (Boolean(input.statusMove)) return { damage: null, skipped: "status_move" };
  if (Boolean(input.disguise) || Boolean(input.iceFace)) {
    return { damage: 1, fixedByDisguiseOrIceFace: true };
  }

  const maxStage = STAT_STAGE_MAXIMUM;
  const critical = Boolean(input.critical);
  let baseDamage = Number(input.baseDamage ?? 0);
  let attack = Number(input.attack ?? 0);
  let defense = Number(input.defense ?? 0);
  let attackStageIndex = Number(input.attackStageIndex ?? maxStage);
  let defenseStageIndex = Number(input.defenseStageIndex ?? maxStage);

  if (!Boolean(input.targetUnaware) || Boolean(input.moldBreaker)) {
    if (critical && attackStageIndex < maxStage) attackStageIndex = maxStage;
    attack = Math.floor(attack * STAT_STAGE_MULTIPLIERS[attackStageIndex] / STAT_STAGE_DIVISORS[attackStageIndex]);
  }
  if (!Boolean(input.userUnaware)) {
    if (critical && defenseStageIndex > maxStage) defenseStageIndex = maxStage;
    defense = Math.floor(defense * STAT_STAGE_MULTIPLIERS[defenseStageIndex] / STAT_STAGE_DIVISORS[defenseStageIndex]);
  }

  baseDamage = Math.max(rubyRound(baseDamage * Number(input.powerMultiplier ?? 1)), 1);
  attack = Math.max(rubyRound(attack * Number(input.attackMultiplier ?? 1)), 1);
  defense = Math.max(rubyRound(defense * Number(input.defenseMultiplier ?? 1)), 1);
  const level = Number(input.level ?? 1);
  let damage = Math.floor(Math.floor(Math.floor((2.0 * level / 5) + 2) * baseDamage * attack / defense) / 50) + 2;
  damage = Math.max(rubyRound(damage * Number(input.finalDamageMultiplier ?? 1)), 1);
  return { damage, critical, baseDamage, attack, defense, attackStageIndex, defenseStageIndex };
}

export function resolveAccuracyDamageActionCanonical(action = {}) {
  const resolved = { ...action };
  if (action.accuracyInput) {
    const accuracy = accuracyCheckCanonical(action.accuracyInput);
    resolved.accuracyHit = accuracy.hit;
    resolved.accuracyResolution = accuracy;
  }
  if (resolved.accuracyHit && action.damageInput) {
    const damage = calcDamageCanonical(action.damageInput);
    if (damage.damage !== null) resolved.calculatedDamage = damage.damage;
    resolved.damageResolution = damage;
  }
  if (resolved.accuracyHit && resolved.hpBefore !== undefined && resolved.calculatedDamage !== undefined) {
    const amount = Math.min(Number(resolved.hpBefore), Math.max(1, rubyRound(resolved.calculatedDamage)));
    resolved.fainted = Number(resolved.hpBefore) - amount <= 0;
  }
  return resolved;
}
