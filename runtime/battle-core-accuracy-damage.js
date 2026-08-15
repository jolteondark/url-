const STAT_STAGE_MAXIMUM = 6;
const STAT_STAGE_MULTIPLIERS = [2, 2, 2, 2, 2, 2, 2, 3, 4, 5, 6, 7, 8];
const STAT_STAGE_DIVISORS = [8, 7, 6, 5, 4, 3, 2, 2, 2, 2, 2, 2, 2];
const ACC_EVA_STAGE_MULTIPLIERS = [3, 3, 3, 3, 3, 3, 3, 4, 5, 6, 7, 8, 9];
const ACC_EVA_STAGE_DIVISORS = [9, 8, 7, 6, 5, 4, 3, 3, 3, 3, 3, 3, 3];
const CALC_DAMAGE_MULTIPLIERS_BODY_SHA256 = "d4c7c2e7dd7237f911b20f61ca809a6e08087695d17a2dc335ae197b4b327b39";

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

export function calcDamageMultipliersCanonical(input = {}) {
  let powerMultiplier = Number(input.externalPowerMultiplier ?? 1);
  let attackMultiplier = Number(input.externalAttackMultiplier ?? 1);
  let defenseMultiplier = Number(input.externalDefenseMultiplier ?? 1);
  let finalDamageMultiplier = Number(input.externalFinalDamageMultiplier ?? 1);
  const type = input.type ?? null;
  const mechanicsGeneration = Number(input.mechanicsGeneration ?? 9);

  if ((Boolean(input.darkAura) && type === "DARK") || (Boolean(input.fairyAura) && type === "FAIRY")) {
    powerMultiplier *= Boolean(input.auraBreak) ? 3 / 4 : 4 / 3;
  }
  if (Number(input.parentalBond ?? 0) === 1) powerMultiplier /= mechanicsGeneration >= 7 ? 4 : 2;
  if (Boolean(input.meFirst)) powerMultiplier *= 1.5;
  if (Boolean(input.helpingHand) && !Boolean(input.confusionMove)) powerMultiplier *= 1.5;
  if (Number(input.chargeTurns ?? 0) > 0 && type === "ELECTRIC") powerMultiplier *= 2;
  if (type === "ELECTRIC") {
    if (Boolean(input.mudSportBattlerActive)) powerMultiplier /= 3;
    if (Number(input.mudSportFieldTurns ?? 0) > 0) powerMultiplier /= 3;
  }
  if (type === "FIRE") {
    if (Boolean(input.waterSportBattlerActive)) powerMultiplier /= 3;
    if (Number(input.waterSportFieldTurns ?? 0) > 0) powerMultiplier /= 3;
  }

  const terrainMultiplier = mechanicsGeneration >= 8 ? 1.3 : 1.5;
  if (input.terrain === "Electric" && type === "ELECTRIC" && Boolean(input.userAffectedByTerrain)) powerMultiplier *= terrainMultiplier;
  if (input.terrain === "Grassy" && type === "GRASS" && Boolean(input.userAffectedByTerrain)) powerMultiplier *= terrainMultiplier;
  if (input.terrain === "Psychic" && type === "PSYCHIC" && Boolean(input.userAffectedByTerrain)) powerMultiplier *= terrainMultiplier;
  if (input.terrain === "Misty" && type === "DRAGON" && Boolean(input.targetAffectedByTerrain)) powerMultiplier /= 2;

  if (Boolean(input.internalBattle)) {
    const badgeCount = Number(input.badgeCount ?? 0);
    if (Boolean(input.userOwnedByPlayer)) {
      if (Boolean(input.physicalMove) && badgeCount >= Number(input.badgesBoostAttack ?? Infinity)) attackMultiplier *= 1.1;
      else if (Boolean(input.specialMove) && badgeCount >= Number(input.badgesBoostSpAtk ?? Infinity)) attackMultiplier *= 1.1;
    }
    if (Boolean(input.targetOwnedByPlayer)) {
      if (Boolean(input.physicalMove) && badgeCount >= Number(input.badgesBoostDefense ?? Infinity)) defenseMultiplier *= 1.1;
      else if (Boolean(input.specialMove) && badgeCount >= Number(input.badgesBoostSpDef ?? Infinity)) defenseMultiplier *= 1.1;
    }
  }

  if (Number(input.numTargets ?? 1) > 1) finalDamageMultiplier *= 0.75;
  switch (input.effectiveWeather) {
    case "Sun": case "HarshSun":
      if (type === "FIRE") finalDamageMultiplier *= 1.5;
      if (type === "WATER") finalDamageMultiplier /= 2;
      break;
    case "Rain": case "HeavyRain":
      if (type === "FIRE") finalDamageMultiplier /= 2;
      if (type === "WATER") finalDamageMultiplier *= 1.5;
      break;
    case "Sandstorm":
      if (Boolean(input.targetRockType) && Boolean(input.specialMove) && input.functionCode !== "UseTargetDefenseInsteadOfTargetSpDef") defenseMultiplier *= 1.5;
      break;
    case "ShadowSky":
      if (type === "SHADOW") finalDamageMultiplier *= 1.5;
      break;
  }

  if (Boolean(input.critical)) finalDamageMultiplier *= Boolean(input.newCriticalHitRateMechanics ?? true) ? 1.5 : 2;
  if (!Boolean(input.confusionMove)) finalDamageMultiplier *= (85 + Number(input.randomRoll ?? 0)) / 100;
  if (type && Boolean(input.userHasType)) finalDamageMultiplier *= Boolean(input.adaptability) ? 2 : 1.5;
  finalDamageMultiplier *= Number(input.typeMod ?? 1);
  if (input.userStatus === "BURN" && Boolean(input.physicalMove) && Boolean(input.damageReducedByBurn ?? true) && !Boolean(input.guts)) finalDamageMultiplier /= 2;

  if (!Boolean(input.ignoresReflect) && !Boolean(input.critical) && !Boolean(input.infiltrator)) {
    const sideCount = Number(input.sideBattlerCount ?? 1);
    const screenMultiplier = sideCount > 1 ? 2 / 3 : 1 / 2;
    if (Number(input.auroraVeilTurns ?? 0) > 0) finalDamageMultiplier *= screenMultiplier;
    else if (Number(input.reflectTurns ?? 0) > 0 && Boolean(input.physicalMove)) finalDamageMultiplier *= screenMultiplier;
    else if (Number(input.lightScreenTurns ?? 0) > 0 && Boolean(input.specialMove)) finalDamageMultiplier *= screenMultiplier;
  }
  if (Boolean(input.targetMinimized) && Boolean(input.tramplesMinimize)) finalDamageMultiplier *= 2;

  powerMultiplier *= Number(input.movePowerMultiplier ?? 1);
  finalDamageMultiplier *= Number(input.moveFinalDamageMultiplier ?? 1);
  return {
    powerMultiplier, attackMultiplier, defenseMultiplier, finalDamageMultiplier,
    sourceComplete: true,
    sourceSymbol: "Battle::Move#pbCalcDamageMultipliers",
    sourceBodySha256: CALC_DAMAGE_MULTIPLIERS_BODY_SHA256,
  };
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

  const multiplierResolution = input.damageMultiplierInput
    ? calcDamageMultipliersCanonical({ ...input.damageMultiplierInput, critical: input.damageMultiplierInput.critical ?? critical })
    : null;
  const powerMultiplier = multiplierResolution?.powerMultiplier ?? Number(input.powerMultiplier ?? 1);
  const attackMultiplier = multiplierResolution?.attackMultiplier ?? Number(input.attackMultiplier ?? 1);
  const defenseMultiplier = multiplierResolution?.defenseMultiplier ?? Number(input.defenseMultiplier ?? 1);
  const finalDamageMultiplier = multiplierResolution?.finalDamageMultiplier ?? Number(input.finalDamageMultiplier ?? 1);

  baseDamage = Math.max(rubyRound(baseDamage * powerMultiplier), 1);
  attack = Math.max(rubyRound(attack * attackMultiplier), 1);
  defense = Math.max(rubyRound(defense * defenseMultiplier), 1);
  const level = Number(input.level ?? 1);
  let damage = Math.floor(Math.floor(Math.floor((2.0 * level / 5) + 2) * baseDamage * attack / defense) / 50) + 2;
  damage = Math.max(rubyRound(damage * finalDamageMultiplier), 1);
  return {
    damage, critical, baseDamage, attack, defense, attackStageIndex, defenseStageIndex,
    ...(multiplierResolution ? { damageMultiplierResolution: multiplierResolution } : {}),
  };
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
