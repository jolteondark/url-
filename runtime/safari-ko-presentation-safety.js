function isKoRound(result = {}) {
  if (Number(result?.decision ?? 0) > 0) return true;
  if (result?.foeReplacementApplied === true || result?.replacementApplied === true) return true;
  if (result?.trainerReplacementContinuation?.result === "continued_with_replacement") return true;
  return (result?.operations ?? []).some((operation) =>
    operation?.op === "faint"
    || operation?.op === "faint_self"
    || ((operation?.op === "reduce_hp" || operation?.op === "reduce_self_hp")
      && Number(operation?.hpAfter) <= 0));
}

function keepImmediateEvent(event) {
  return event?.type !== "move_started" && event?.type !== "damage_applied";
}

export function stabilizeSafariKoPresentation(result = {}) {
  if (!isKoRound(result)) return result;
  return {
    ...result,
    presentation: (result.presentation ?? []).filter(keepImmediateEvent),
    safariKoPresentationImmediate: true,
  };
}
