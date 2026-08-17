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

/**
 * Safari presentation safety boundary for KO/replacement rounds.
 *
 * Battle/domain state is already committed before preview.js replays presentation.
 * Replaying old-target damage animations after a KO races the canonical sprite,
 * status and trainer replacement bridges, which read the newly committed state.
 * On WebKit this can leave the battle surface stalled. Keep semantic terminal /
 * replacement events, but skip old-target timed DOM animation on KO rounds.
 */
export function stabilizeSafariKoPresentation(result = {}) {
  if (!isKoRound(result)) return result;
  return {
    ...result,
    presentation: (result.presentation ?? []).filter(keepImmediateEvent),
    safariKoPresentationImmediate: true,
  };
}
