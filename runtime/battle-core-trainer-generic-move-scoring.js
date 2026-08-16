export const GET_MOVE_SCORES_BODY_SHA256 = "909f7a95735c53accb664f10e12479c78b62041076595c53664bc54f5fc75823";
export const PREDICTED_ACCURACY_SLICE_SHA256 = "858ee92a74aa1be3a6f8351cfa56698db2d53b4b1cdadddac2c6ae783efe655d";
export const PREDICTED_DAMAGE_SLICE_SHA256 = "194d5353d697e0f6512d5075227ed306043927b7c77fa39b61ea835f418366d0";
export const ROUGH_DAMAGE_SLICE_SHA256 = "490c633db12dd05baf9b935e58fee770023c05d0f407eb4a823ba8a32df4ecc3";

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
function rubyToI(value) { return Math.trunc(finiteNumber(value)); }

export function applyPredictedAccuracyScoreCanonical(score, input = {}) {
  let resolved = rubyToI(score);
  const accuracy = rubyToI(input.roughAccuracy);
  if (accuracy < 90) resolved -= rubyToI(0.25 * (100 - accuracy));
  return resolved;
}

export function applyPredictedDamageScoreCanonical(score, input = {}) {
  let resolved = rubyToI(score);
  if (!input.damagingMove) return resolved;
  const damage = finiteNumber(input.roughDamage);
  const targetHp = finiteNumber(input.targetHp);
  const substituteHp = finiteNumber(input.substituteHp);
  if (substituteHp > 0) {
    resolved += rubyToI(Math.min((15.0 * damage) / substituteHp, 20));
    return resolved;
  }
  if (targetHp <= 0) return resolved;
  resolved += rubyToI(Math.min((25.0 * damage) / targetHp, 30));
  if (input.hpAware && damage > targetHp * 1.1) {
    resolved += 10;
    if (input.multiHitMove && finiteNumber(input.targetTotalHp) === targetHp && (input.targetHasSturdy || input.targetHasFocusSash)) resolved += 8;
  }
  return resolved;
}

export function applyGenericTrainerMoveAgainstTargetScoreCanonical(input = {}) {
  const accuracyAdjusted = applyPredictedAccuracyScoreCanonical(input.score, input);
  const damageAdjusted = applyPredictedDamageScoreCanonical(accuracyAdjusted, input);
  return {
    scoreBefore: rubyToI(input.score),
    scoreAfterAccuracy: accuracyAdjusted,
    scoreAfterDamage: damageAdjusted,
    score: Math.min(damageAdjusted, 255),
    sourceSlices: { predictedAccuracy: PREDICTED_ACCURACY_SLICE_SHA256, predictedDamage: PREDICTED_DAMAGE_SLICE_SHA256 },
  };
}

export function applyTrainerSkillMarginCanonical(score, input = {}) {
  let resolved = rubyToI(score);
  if (!input.wildPokemon && resolved !== 0) resolved = Math.min(resolved + rubyToI(input.skill), 255);
  return resolved;
}

export function buildTrainerMoveChoicesFromGenericScoresCanonical(candidates = []) {
  return (Array.isArray(candidates) ? candidates : []).map((candidate) => {
    const scoreWithMargin = applyTrainerSkillMarginCanonical(candidate?.score ?? 100, candidate ?? {});
    const projection = applyGenericTrainerMoveAgainstTargetScoreCanonical({ ...candidate, score: scoreWithMargin });
    return {
      moveIndex: Number(candidate?.moveIndex ?? -1),
      targetIndex: Number(candidate?.targetIndex ?? -1),
      score: Math.max(0, projection.score),
      genericScoreProjection: projection,
    };
  });
}
