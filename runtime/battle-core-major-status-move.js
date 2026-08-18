import { canInflictMajorStatusCanonical } from "./battle-core-status-eligibility.js";
import { resolveCanonicalTypeEffectivenessV108 } from "./canonical-type-effectiveness-v108.js";

export const MAJOR_STATUS_MOVE_EFFECT_SOURCES_V108 = Object.freeze({
  ParalyzeTargetIfNotTypeImmune: Object.freeze({
    functionCode: "ParalyzeTargetIfNotTypeImmune",
    status: "PARALYSIS",
    requiresMoveTypeEffectiveness: true,
    sourceOwner: "canonical FunctionCode + Battle::Battler#pbCanInflictStatus?",
  }),
  ParalyzeTarget: Object.freeze({
    functionCode: "ParalyzeTarget",
    status: "PARALYSIS",
    requiresMoveTypeEffectiveness: false,
    sourceOwner: "canonical FunctionCode + Battle::Battler#pbCanInflictStatus?",
  }),
  PoisonTarget: Object.freeze({
    functionCode: "PoisonTarget",
    status: "POISON",
    requiresMoveTypeEffectiveness: false,
    sourceOwner: "canonical FunctionCode + Battle::Battler#pbCanInflictStatus?",
  }),
  BurnTarget: Object.freeze({
    functionCode: "BurnTarget",
    status: "BURN",
    requiresMoveTypeEffectiveness: false,
    sourceOwner: "canonical FunctionCode + Battle::Battler#pbCanInflictStatus?",
  }),
  FreezeTarget: Object.freeze({
    functionCode: "FreezeTarget",
    status: "FROZEN",
    requiresMoveTypeEffectiveness: false,
    sourceOwner: "canonical FunctionCode + Battle::Battler#pbCanInflictStatus?",
  }),
});

// Kept for the existing Thunder Wave source-pin callers.
export const MAJOR_STATUS_MOVE_EFFECT_SOURCE_V108 = MAJOR_STATUS_MOVE_EFFECT_SOURCES_V108.ParalyzeTargetIfNotTypeImmune;

export function majorStatusMoveEffectSourceCanonical(move) {
  if (!move || move.category !== "Status") return null;
  return MAJOR_STATUS_MOVE_EFFECT_SOURCES_V108[move.function_code] ?? null;
}

export function secondaryMajorStatusMoveEffectSourceCanonical(move) {
  if (!move || move.category === "Status" || Number(move.effect_chance ?? 0) <= 0) return null;
  const source = MAJOR_STATUS_MOVE_EFFECT_SOURCES_V108[move.function_code] ?? null;
  if (!source || source.functionCode === "ParalyzeTargetIfNotTypeImmune") return null;
  return source;
}

function requireTargetTypes(targetTypes, functionCode) {
  if (!Array.isArray(targetTypes) || targetTypes.length < 1) {
    throw new TypeError(`targetTypes are required for ${functionCode}`);
  }
}

function resolveEligibility(source, target, targetTypes, eligibilityFacts) {
  return canInflictMajorStatusCanonical({
    newStatus: source.status,
    currentStatus: target?.status ?? "NONE",
    fainted: Number(target?.hp ?? 0) <= 0,
    targetTypes,
    ...eligibilityFacts,
  });
}

export function resolveMajorStatusMoveEffectCanonical({ move, target, targetTypes, targetBattlerIndex, eligibilityFacts = {} } = {}) {
  const source = majorStatusMoveEffectSourceCanonical(move);
  if (!source) return null;
  requireTargetTypes(targetTypes, source.functionCode);
  const typeResolution = source.requiresMoveTypeEffectiveness
    ? resolveCanonicalTypeEffectivenessV108(move.type, targetTypes)
    : null;
  if (typeResolution?.immune) {
    return { supported: true, canInflict: false, reason: "move_type_immunity", typeResolution, source };
  }
  const eligibility = resolveEligibility(source, target, targetTypes, eligibilityFacts);
  return {
    supported: true,
    canInflict: eligibility.canInflict,
    reason: eligibility.reason,
    eligibility,
    ...(typeResolution ? { typeResolution } : {}),
    source,
    ...(eligibility.canInflict ? {
      battleStatusInput: {
        kind: "inflict",
        newStatus: source.status,
        newStatusCount: 0,
        targetBattlerIndex: Number(targetBattlerIndex),
        requiresAccuracyHit: true,
        commitOnExecutedHit: true,
      },
    } : {}),
  };
}

export function resolveSecondaryMajorStatusMoveEffectCanonical({ move, target, targetTypes, targetBattlerIndex, eligibilityFacts = {} } = {}) {
  const source = secondaryMajorStatusMoveEffectSourceCanonical(move);
  if (!source) return null;
  requireTargetTypes(targetTypes, source.functionCode);

  // Damaging additional effects only exist after the damaging move itself can
  // affect the target. This is deliberately stricter than Status-category
  // ParalyzeTarget (e.g. Stun Spore can affect Ground): Thunder Shock must not
  // roll paralysis against a Ground immunity.
  const typeResolution = resolveCanonicalTypeEffectivenessV108(move.type, targetTypes);
  if (typeResolution.immune) {
    return { supported: true, canInflict: false, reason: "move_type_immunity", typeResolution, source };
  }

  const eligibility = resolveEligibility(source, target, targetTypes, eligibilityFacts);
  const effectChance = Number(move.effect_chance ?? 0);
  return {
    supported: true,
    canInflict: eligibility.canInflict,
    reason: eligibility.reason,
    eligibility,
    typeResolution,
    source,
    effectChance,
    ...(eligibility.canInflict ? {
      secondaryEffectInput: {
        // The seeded owner performs the canonical chance roll before the full
        // hit resolution is materialized. Runtime commit below still requires
        // an actual reduce_hp operation, so misses/protect/immunity cannot
        // persist a status even if this deterministic roll triggers.
        calcDamage: 1,
        effectChance,
        functionCode: source.functionCode,
      },
      battleStatusInput: {
        kind: "inflict",
        newStatus: source.status,
        newStatusCount: 0,
        targetBattlerIndex: Number(targetBattlerIndex),
        requiresAccuracyHit: true,
        commitOnExecutedHit: true,
        secondaryEffectTargetIndex: 0,
        requiresDamageDealt: true,
      },
    } : {}),
  };
}
