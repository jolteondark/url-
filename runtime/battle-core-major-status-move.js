import { canInflictMajorStatusCanonical } from "./battle-core-status-eligibility.js";
import { resolveCanonicalTypeEffectivenessV108 } from "./canonical-type-effectiveness-v108.js";

export const MAJOR_STATUS_MOVE_EFFECT_SOURCES_V108 = Object.freeze({
  ParalyzeTargetIfNotTypeImmune: Object.freeze({
    functionCode: "ParalyzeTargetIfNotTypeImmune",
    status: "PARALYSIS",
    requiresMoveTypeEffectiveness: true,
    sourceOwner: "canonical FunctionCode + Battle::Battler#pbCanInflictStatus?",
  }),
  BurnTarget: Object.freeze({
    functionCode: "BurnTarget",
    status: "BURN",
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

export function resolveMajorStatusMoveEffectCanonical({ move, target, targetTypes, targetBattlerIndex, eligibilityFacts = {} } = {}) {
  const source = majorStatusMoveEffectSourceCanonical(move);
  if (!source) return null;
  if (!Array.isArray(targetTypes) || targetTypes.length < 1) {
    throw new TypeError(`targetTypes are required for ${source.functionCode}`);
  }
  const typeResolution = source.requiresMoveTypeEffectiveness
    ? resolveCanonicalTypeEffectivenessV108(move.type, targetTypes)
    : null;
  if (typeResolution?.immune) {
    return { supported: true, canInflict: false, reason: "move_type_immunity", typeResolution, source };
  }
  const eligibility = canInflictMajorStatusCanonical({
    newStatus: source.status,
    currentStatus: target?.status ?? "NONE",
    fainted: Number(target?.hp ?? 0) <= 0,
    targetTypes,
    ...eligibilityFacts,
  });
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
