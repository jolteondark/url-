import { canInflictMajorStatusCanonical } from "./battle-core-status-eligibility.js";
import { resolveCanonicalTypeEffectivenessV108 } from "./canonical-type-effectiveness-v108.js";

export const MAJOR_STATUS_MOVE_EFFECT_SOURCE_V108 = Object.freeze({
  functionCode: "ParalyzeTargetIfNotTypeImmune",
  status: "PARALYSIS",
  sourceOwner: "canonical FunctionCode + Battle::Battler#pbCanInflictStatus?",
});

export function resolveMajorStatusMoveEffectCanonical({ move, target, targetTypes, targetBattlerIndex, eligibilityFacts = {} } = {}) {
  if (!move || move.category !== "Status" || move.function_code !== MAJOR_STATUS_MOVE_EFFECT_SOURCE_V108.functionCode) return null;
  if (!Array.isArray(targetTypes) || targetTypes.length < 1) {
    throw new TypeError("targetTypes are required for ParalyzeTargetIfNotTypeImmune");
  }
  const typeResolution = resolveCanonicalTypeEffectivenessV108(move.type, targetTypes);
  if (typeResolution.immune) {
    return { supported: true, canInflict: false, reason: "move_type_immunity", typeResolution, source: MAJOR_STATUS_MOVE_EFFECT_SOURCE_V108 };
  }
  const eligibility = canInflictMajorStatusCanonical({
    newStatus: "PARALYSIS",
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
    typeResolution,
    source: MAJOR_STATUS_MOVE_EFFECT_SOURCE_V108,
    ...(eligibility.canInflict ? {
      battleStatusInput: {
        kind: "inflict",
        newStatus: "PARALYSIS",
        newStatusCount: 0,
        targetBattlerIndex: Number(targetBattlerIndex),
        requiresAccuracyHit: true,
      },
    } : {}),
  };
}
