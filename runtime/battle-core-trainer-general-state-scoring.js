export const AI_TRAINER_SECTION_SHA256 = "c4188ce549b6086dab72437ef0aa8e19cead3e2748e9baf670cd10309929dfb0";
export const SET_UP_SKILL_FLAGS_BODY_SHA256 = "fb03afee120d723e5e7f99f931b68c5b5a7a4b5cac6d718507456b673f1479ee";
export const SANITIZE_SKILL_FLAGS_BODY_SHA256 = "68f2ccc2354b313bd0bfd6b31069d3d754e22dddbfe2358730d3711e23b5c868";
export const THAW_USER_SLICE_SHA256 = "a1224f225cd61a4f65fc61cfe02b7915d36288954f810216e62e911bad04fcfd";
export const RESERVE_PRESSURE_SLICE_SHA256 = "52282d6f9aaca3c461184b13251f821036f82a8f0a88c7e74c68de6c64d11afb";
export const THAW_TARGET_SLICE_SHA256 = "79fe87ebbd81c2eb6d30838a6c4661b759c0d45e6579d5c05ffeb2b346ee98f0";

function integer(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : fallback;
}
function normalizedStatus(value) { return String(value ?? "").toUpperCase(); }

export function buildTrainerSkillFlagsCanonical(skill = 0, trainerFlags = []) {
  const resolved = [...(Array.isArray(trainerFlags) ? trainerFlags : [])].map(String);
  const value = integer(skill);
  if (value > 0) resolved.push("PredictMoveFailure", "ScoreMoves", "PreferMultiTargetMoves");
  if (value >= 32) resolved.push("ConsiderSwitching", "HPAware");
  if (value < 32) resolved.push("UsePokemonInOrder");
  else if (value >= 100) resolved.push("ReserveLastPokemon");
  const unique = [...new Set(resolved)];
  return unique.filter((flag) => !unique.includes(`Anti${flag}`));
}

export function trainerSkillFactsCanonical(skill = 0, trainerFlags = []) {
  const flags = buildTrainerSkillFlagsCanonical(skill, trainerFlags);
  return {
    skill: integer(skill), flags,
    mediumSkill: integer(skill) >= 32,
    highSkill: integer(skill) >= 48,
    bestSkill: integer(skill) >= 100,
    hpAware: flags.includes("HPAware"),
    scoreMoves: flags.includes("ScoreMoves"),
    predictMoveFailure: flags.includes("PredictMoveFailure"),
  };
}

export function applyTrainerGeneralStateScoringCanonical(input = {}) {
  let score = integer(input.score);
  const trace = [];
  const mediumSkill = input.mediumSkill === true;
  const highSkill = input.highSkill === true;
  const damagingMove = input.damagingMove === true;
  const mechanicsGeneration = integer(input.mechanicsGeneration, 9);
  const moveThawsUser = input.moveThawsUser === true;

  if (mediumSkill && normalizedStatus(input.targetStatus) === "FROZEN") {
    const moveType = String(input.moveType ?? "").toUpperCase();
    if (moveType === "FIRE" || (mechanicsGeneration >= 6 && moveThawsUser)) {
      score -= 20;
      trace.push({ kind: "thaw_frozen_target", delta: -20, sourceSliceSha256: THAW_TARGET_SLICE_SHA256 });
    }
  }
  if (mediumSkill && normalizedStatus(input.userStatus) === "FROZEN") {
    if (moveThawsUser) {
      score += 20;
      trace.push({ kind: "thaw_frozen_user", delta: 20, sourceSliceSha256: THAW_USER_SLICE_SHA256 });
    } else if (input.userKnowsThawingMove === true) {
      score -= 20;
      trace.push({ kind: "prefer_other_thawing_move", delta: -20, sourceSliceSha256: THAW_USER_SLICE_SHA256 });
    }
  }
  if (mediumSkill && damagingMove) {
    const reserves = integer(input.ownReserveCount, -1);
    const foes = integer(input.foeReserveCount, -1);
    if (reserves >= 0 && foes >= 0 && !(highSkill && foes > reserves)) {
      if (foes === 0) {
        score += 10;
        trace.push({ kind: "foe_last_pokemon", delta: 10, sourceSliceSha256: RESERVE_PRESSURE_SLICE_SHA256 });
      } else if (reserves === 0) {
        score += 5;
        trace.push({ kind: "user_last_pokemon", delta: 5, sourceSliceSha256: RESERVE_PRESSURE_SLICE_SHA256 });
      }
    }
  }
  return { score, trace };
}
