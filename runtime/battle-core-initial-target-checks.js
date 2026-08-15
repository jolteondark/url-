import { successCheckAgainstTargetCanonical } from "./battle-core-success-check-target.js";

function num(v, f = 0) {
  const n = Number(v ?? f);
  return Number.isFinite(n) ? n : f;
}

export function resolveInitialTargetChecksCanonical(action = {}) {
  const resolved = structuredClone(action ?? {});
  const input = resolved.hitLoopInput;
  if (resolved.kind !== "move" || !input || !Array.isArray(input.targetChecks)) return resolved;
  const targetChecks = input.targetChecks.map((target) => {
    const next = { ...target };
    if (!target?.initialSuccessCheckInput) return next;
    const result = successCheckAgainstTargetCanonical(target.initialSuccessCheckInput);
    next.success = result.success;
    next.protected = result.protected;
    next.magicCoat = result.magicCoat;
    next.magicBounce = result.magicBounce;
    next.typeMod = result.typeMod;
    next.initialSuccessResolution = result;
    return next;
  });
  let magicCoaterIndex = num(input.magicCoaterIndex, -1);
  let magicBouncerIndex = num(input.magicBouncerIndex, -1);
  for (const target of targetChecks) {
    if (target.magicCoat) magicCoaterIndex = num(target.index, -1);
    if (target.magicBounce) magicBouncerIndex = num(target.index, -1);
  }
  resolved.hitLoopInput = { ...input, targetChecks, magicCoaterIndex, magicBouncerIndex };
  resolved.initialTargetCheckResolutions = targetChecks.filter((t) => t.initialSuccessResolution).map((t) => ({ targetIndex: num(t.index, -1), ...t.initialSuccessResolution }));
  return resolved;
}
