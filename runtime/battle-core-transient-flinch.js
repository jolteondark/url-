function n(value, fallback = 0) {
  const resolved = Number(value ?? fallback);
  return Number.isFinite(resolved) ? resolved : fallback;
}

function triggeredFlinchSecondary(action = {}) {
  return (Array.isArray(action?.secondaryEffectInputs) ? action.secondaryEffectInputs : []).find((entry) =>
    entry?.functionCode === "FlinchTarget" && entry?.triggered === true
  ) ?? null;
}

export function applyTriggeredFlinchToLaterActionCanonical({ sourceAction = {}, targetAction = {} } = {}) {
  const secondary = triggeredFlinchSecondary(sourceAction);
  if (!secondary) return { applied: false, reason: "not_triggered", action: structuredClone(targetAction) };
  if (sourceAction.moveSkipped) return { applied: false, reason: "source_skipped", action: structuredClone(targetAction) };
  if (n(sourceAction?.hpReductionResolution?.amount, 0) <= 0) {
    return { applied: false, reason: "no_damage", action: structuredClone(targetAction) };
  }
  if (sourceAction.fainted) return { applied: false, reason: "target_fainted", action: structuredClone(targetAction) };

  const sourceTarget = Number(sourceAction.targetBattlerIndex);
  const targetBattler = Number(targetAction.battlerIndex);
  if (!Number.isInteger(sourceTarget) || !Number.isInteger(targetBattler) || sourceTarget !== targetBattler) {
    return { applied: false, reason: "different_target", action: structuredClone(targetAction) };
  }
  if (targetAction.kind !== "move") {
    return { applied: false, reason: "target_not_move", action: structuredClone(targetAction) };
  }

  const prepared = structuredClone(targetAction);
  const useMoveInput = prepared.useMoveInput ?? {};
  prepared.useMoveInput = {
    ...useMoveInput,
    tryUseMoveInput: {
      ...(useMoveInput.tryUseMoveInput ?? {}),
      flinch: true,
    },
  };
  prepared.transientFlinchResolution = {
    applied: true,
    sourceFunctionCode: secondary.functionCode,
    sourceMoveId: sourceAction.moveId ?? null,
  };
  return { applied: true, reason: "flinch", action: prepared };
}
