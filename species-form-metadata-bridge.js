import "./pokemon-center-presentation.js";
import { createSafariPlayableRuntime, loadSafariPlayableRun } from "./runtime/safari-playable-integration.js";

function loadSnapshot() {
  const fallback = createSafariPlayableRuntime();
  try {
    const loaded = loadSafariPlayableRun(window.localStorage, fallback);
    return loaded.found ? loaded.state : fallback;
  } catch (_) {
    return fallback;
  }
}

function stamp(root, pokemon) {
  if (!root || !pokemon?.species) return;
  root.dataset.species = String(pokemon.species);
  root.dataset.form = String(Number.isFinite(Number(pokemon.form)) ? Number(pokemon.form) : 0);
}

export function stampSafariSpeciesFormMetadata(snapshot = loadSnapshot()) {
  const party = Array.isArray(snapshot?.player?.party) ? snapshot.player.party : [];
  document.querySelectorAll("#party-detail-grid .party-slot:not(.empty)").forEach((slot, index) => stamp(slot, party[index]));

  const stored = [];
  for (const box of Array.isArray(snapshot?.storage_system?.boxes) ? snapshot.storage_system.boxes : []) {
    for (const pokemon of Array.isArray(box?.slots) ? box.slots : []) if (pokemon) stored.push(pokemon);
  }
  document.querySelectorAll("#storage-detail-boxes .storage-slot").forEach((slot, index) => stamp(slot, stored[index]));
}
