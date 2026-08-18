import { resolveAccuracyDamageActionCanonical } from "./battle-core-accuracy-damage.js";
import { isCriticalCanonical, damageStatsCanonical } from "./battle-core-critical-stats.js";

export function resolveAccuracyDamageVerticalCanonical(action = {}) {
  const prepared = structuredClone(action);
  if (prepared.damageInput) {
    prepared.damageInput = { ...prepared.damageInput };
    const multiplierInput = prepared.damageInput.damageMultiplierInput;
    if (
      prepared.damageInput.statusMove === undefined &&
      Number(prepared.damageInput.baseDamage ?? 0) === 0 &&
      multiplierInput?.physicalMove === false &&
      multiplierInput?.specialMove === false
    ) {
      prepared.damageInput.statusMove = true;
    }
    if (prepared.damageInput.criticalInput) {
      const criticalResolution = isCriticalCanonical(prepared.damageInput.criticalInput);
      prepared.damageInput.critical = criticalResolution.critical;
      prepared.criticalResolution = criticalResolution;
    }
    if (prepared.damageInput.statInput) {
      const statResolution = damageStatsCanonical(prepared.damageInput.statInput);
      prepared.damageInput.attack = statResolution.attack;
      prepared.damageInput.attackStageIndex = statResolution.attackStageIndex;
      prepared.damageInput.defense = statResolution.defense;
      prepared.damageInput.defenseStageIndex = statResolution.defenseStageIndex;
      prepared.damageStatResolution = statResolution;
    }
  }
  const resolved = resolveAccuracyDamageActionCanonical(prepared);
  if (resolved.damageResolution) {
    if (prepared.criticalResolution) resolved.damageResolution.criticalResolution = structuredClone(prepared.criticalResolution);
    if (prepared.damageStatResolution) resolved.damageResolution.damageStatResolution = structuredClone(prepared.damageStatResolution);
  }
  return resolved;
}
