import { attemptSafariFlee as attemptSafariFleeOwner } from "./runtime/safari-flee-command.js";

function fleePresentationEvent(snapshot, result) {
  return {
    type: "flee",
    result: result.escaped ? "escaped" : (result.blocked ? "blocked" : "failed"),
    reason: result.resolution?.reason ?? null,
    actor: "player",
    actorSpecies: snapshot.playerSpecies,
    target: "foe",
    targetSpecies: snapshot.foeSpecies,
  };
}

export function attemptSafariFleeWithPresentation(runtime, options = {}) {
  const state = runtime?.variables?.mapless;
  const battle = state?.battle;
  const playerIndex = Number(battle?.player_party_index ?? 0);
  const snapshot = Object.freeze({
    playerSpecies: runtime?.player?.party?.[playerIndex]?.species ?? null,
    foeSpecies: battle?.foe?.species ?? null,
  });

  // Mechanics remain wholly owned by safari-flee-command. The adapter invokes
  // it exactly once and only decorates the returned presentation sequence.
  const result = attemptSafariFleeOwner(runtime, options);
  const existing = Array.isArray(result.presentation) ? result.presentation : [];
  return {
    ...result,
    presentation: [fleePresentationEvent(snapshot, result), ...existing],
  };
}
