import * as playable from "./safari-playable-integration-boundary-return.js";
import { stabilizeSafariKoPresentation } from "./safari-ko-presentation-safety.js";
import { continueSafariTrainerAfterFirstKo } from "./safari-trainer-replacement-continuation.js";
import { activateSafariDayBoardCell as activateSafariDayBoardCellOwner } from "./safari-pokemon-center-command.js";

export * from "./safari-playable-integration-boundary-return.js";
export { attemptSafariCapture } from "./safari-capture-command.js";
export { safariShopPresentation } from "./safari-shop-display-presentation.js";

function resolvedPokemonForm(pokemon) {
  if (pokemon?.form == null) return 0;
  const form = Number(pokemon.form);
  return Number.isInteger(form) && form >= 0 ? form : null;
}

function battlePresentationState(runtime) {
  const battle = runtime?.variables?.mapless?.battle;
  if (!battle) return null;
  const party = Array.isArray(runtime?.player?.party) ? runtime.player.party : [];
  const requestedIndex = Number(battle.player_party_index ?? 0);
  const playerPartyIndex = Number.isInteger(requestedIndex) && requestedIndex >= 0 && requestedIndex < party.length
    ? requestedIndex
    : 0;
  const player = party[playerPartyIndex] ?? null;
  const foe = battle.foe ?? null;
  return {
    playerPartyIndex,
    player: player ? { species: String(player.species ?? ""), form: resolvedPokemonForm(player) } : null,
    foe: foe ? { species: String(foe.species ?? ""), form: resolvedPokemonForm(foe) } : null,
  };
}

function notifySafariRuntimeChanged(runtime) {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") return;
  const detail = { battle: battlePresentationState(runtime) };
  queueMicrotask(() => window.dispatchEvent(new CustomEvent("safari-runtime-changed", { detail })));
}

export function activateSafariDayBoardCell(runtime, index) {
  const result = activateSafariDayBoardCellOwner(runtime, index);
  notifySafariRuntimeChanged(runtime);
  return result;
}

function finalizeSafariRoundPresentation(runtime, result) {
  const continued = continueSafariTrainerAfterFirstKo(runtime, result);
  const stabilized = stabilizeSafariKoPresentation(continued);
  // Battle state is already committed at this boundary. Notify the scene-demand
  // bridges explicitly instead of relying on incidental DOM mutation timing.
  notifySafariRuntimeChanged(runtime);
  return stabilized;
}

export function resolveSafariBattleRound(runtime, selectedMoveId) {
  const result = playable.resolveSafariBattleRound(runtime, selectedMoveId);
  if (result && typeof result.then === "function") {
    return result.then((resolved) => finalizeSafariRoundPresentation(runtime, resolved));
  }
  return finalizeSafariRoundPresentation(runtime, result);
}
