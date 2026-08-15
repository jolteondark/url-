const STAT_STAGE_MAXIMUM = 6;
const IS_CRITICAL_BODY_SHA256 = "d0b192903ddae375019a6310cb45d59b4f6c3e45f69b919b0fd0d45830644132";
const GET_ATTACK_STATS_BODY_SHA256 = "e575b720e378044b921725943b2de4270e54e883478a0fd0f775a3b9f82e64e0";
const GET_DEFENSE_STATS_BODY_SHA256 = "07c703db9203df176a5c1edddc38320cd83bd50e6182bf03ad15180ba467467d";

export function isCriticalCanonical(input = {}) {
  if (Number(input.luckyChantTurns ?? 0) > 0) {
    return { critical: false, reason: "lucky_chant", affectionCritical: false, sourceComplete: true, sourceSymbol: "Battle::Move#pbIsCritical?", sourceBodySha256: IS_CRITICAL_BODY_SHA256 };
  }
  let stage = Number(input.externalCriticalStage ?? input.criticalStage ?? 0);
  if (stage < 0) {
    return { critical: false, reason: "external_never", criticalStage: stage, affectionCritical: false, sourceComplete: true, sourceSymbol: "Battle::Move#pbIsCritical?", sourceBodySha256: IS_CRITICAL_BODY_SHA256 };
  }
  const override = Number(input.criticalOverride ?? 0);
  if (override === 1 || override === -1) {
    return { critical: override === 1, reason: override === 1 ? "move_always" : "move_never", criticalStage: stage, affectionCritical: false, sourceComplete: true, sourceSymbol: "Battle::Move#pbIsCritical?", sourceBodySha256: IS_CRITICAL_BODY_SHA256 };
  }
  if (stage > 50) {
    return { critical: true, reason: "merciless", criticalStage: stage, affectionCritical: false, sourceComplete: true, sourceSymbol: "Battle::Move#pbIsCritical?", sourceBodySha256: IS_CRITICAL_BODY_SHA256 };
  }
  if (Number(input.laserFocusTurns ?? 0) > 0) {
    return { critical: true, reason: "laser_focus", criticalStage: stage, affectionCritical: false, sourceComplete: true, sourceSymbol: "Battle::Move#pbIsCritical?", sourceBodySha256: IS_CRITICAL_BODY_SHA256 };
  }
  if (Boolean(input.highCriticalRate)) stage += 1;
  stage += Number(input.focusEnergy ?? 0);
  if (Boolean(input.hyperMode) && input.type === "SHADOW") stage += 1;
  const ratios = Boolean(input.newCriticalHitRateMechanics ?? true) ? [24, 8, 2, 1] : [16, 8, 4, 3, 2];
  stage = Math.min(stage, ratios.length - 1);
  const ratio = ratios[stage];
  if (ratio === 1) {
    return { critical: true, reason: "guaranteed_ratio", criticalStage: stage, ratio, affectionCritical: false, sourceComplete: true, sourceSymbol: "Battle::Move#pbIsCritical?", sourceBodySha256: IS_CRITICAL_BODY_SHA256 };
  }
  const randomRoll = Number(input.randomRoll ?? 0);
  if (randomRoll === 0) {
    return { critical: true, reason: "random", criticalStage: stage, ratio, randomRoll, affectionCritical: false, sourceComplete: true, sourceSymbol: "Battle::Move#pbIsCritical?", sourceBodySha256: IS_CRITICAL_BODY_SHA256 };
  }
  const affectionCritical = randomRoll === 1 && Boolean(input.affectionEffects) && Boolean(input.internalBattle) && Boolean(input.userOwnedByPlayer) && Number(input.userAffectionLevel ?? 0) === 5 && !Boolean(input.targetMega);
  return { critical: affectionCritical, reason: affectionCritical ? "affection" : "not_critical", criticalStage: stage, ratio, randomRoll, affectionCritical, sourceComplete: true, sourceSymbol: "Battle::Move#pbIsCritical?", sourceBodySha256: IS_CRITICAL_BODY_SHA256 };
}

export function damageStatsCanonical(input = {}) {
  const special = Boolean(input.specialMove);
  const attack = Number(special ? input.userSpAtk : input.userAttack);
  const attackStage = Number(special ? input.userSpAtkStage : input.userAttackStage ?? 0);
  const defense = Number(special ? input.targetSpDef : input.targetDefense);
  const defenseStage = Number(special ? input.targetSpDefStage : input.targetDefenseStage ?? 0);
  return {
    attack,
    attackStageIndex: attackStage + STAT_STAGE_MAXIMUM,
    defense,
    defenseStageIndex: defenseStage + STAT_STAGE_MAXIMUM,
    specialMove: special,
    sourceComplete: true,
    attackSourceSymbol: "Battle::Move#pbGetAttackStats",
    attackSourceBodySha256: GET_ATTACK_STATS_BODY_SHA256,
    defenseSourceSymbol: "Battle::Move#pbGetDefenseStats",
    defenseSourceBodySha256: GET_DEFENSE_STATS_BODY_SHA256,
  };
}
