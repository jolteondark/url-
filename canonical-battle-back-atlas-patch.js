import { applySafariDay1Back96Sprite } from "./runtime/safari-day1-back-96-atlas.js?v=20260825-1042";

let scheduled = false;

function ensureFrontAsBackGuard() {
  if (document.getElementById("canonical-player-back-front-guard")) return;
  const style = document.createElement("style");
  style.id = "canonical-player-back-front-guard";
  style.textContent = `
    .combatant.player .canonical-battle-atlas-fallback[data-battle-sprite-fallback="species-form-front-for-back"]{
      display:none!important;
    }
  `;
  document.head.append(style);
}

function playerPokemon() {
  const runtime = globalThis.__maplessSafariRuntime;
  const battle = runtime?.variables?.mapless?.battle;
  if (!battle) return null;
  const party = Array.isArray(runtime?.player?.party) ? runtime.player.party : [];
  const index = Number(battle.player_party_index ?? 0);
  return Number.isInteger(index) && index >= 0 && index < party.length ? party[index] : null;
}

function canonicalImageMatches(image, species) {
  return Boolean(
    image
    && !image.hidden
    && image.complete
    && image.naturalWidth > 0
    && (image.dataset.spriteSpecies === species || image.dataset.assetKey?.includes(`:${species}:`))
  );
}

function render() {
  scheduled = false;
  ensureFrontAsBackGuard();
  const card = document.getElementById("battle-card");
  const combatant = document.getElementById("player-combatant");
  if (!card || card.hidden || !combatant) return;
  const pokemon = playerPokemon();
  const species = typeof pokemon?.species === "string" ? pokemon.species.trim() : "";
  if (!species) return;

  const exact = combatant.querySelector(".canonical-battle-sprite");
  if (canonicalImageMatches(exact, species)) return;

  let fallback = combatant.querySelector(".canonical-battle-atlas-fallback");
  if (!fallback) {
    fallback = document.createElement("span");
    fallback.className = "canonical-battle-atlas-fallback";
    fallback.setAttribute("aria-hidden", "true");
    combatant.append(fallback);
  }

  // A front-facing sprite is not a valid substitute for the player's back
  // battler. Fail closed until the canonical back asset is available.
  const backApplied = applySafariDay1Back96Sprite(fallback, species, { size: 96 });
  if (!backApplied) {
    fallback.hidden = true;
    delete fallback.dataset.spriteSpecies;
    delete fallback.dataset.battleSpriteFallback;
    return;
  }
  fallback.hidden = false;
  fallback.dataset.spriteSpecies = species;
  fallback.dataset.battleSpriteFallback = "canonical-back-96";
  const symbol = combatant.querySelector(".text-mon");
  if (symbol) symbol.hidden = true;
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(render);
}

function installObserver() {
  const card = document.getElementById("battle-card");
  if (!card || typeof MutationObserver !== "function") return;
  new MutationObserver(schedule).observe(card, {
    attributes: true,
    subtree: true,
    attributeFilter: ["hidden", "data-turn-phase", "data-sprite-loading", "data-battle-sprite-fallback"],
  });
}

ensureFrontAsBackGuard();
render();
installObserver();
window.addEventListener("pageshow", schedule, { passive: true });
window.addEventListener("safari-runtime-changed", schedule, { passive: true });
window.addEventListener("safari-preview-start", schedule, { passive: true });
window.addEventListener("safari-day1-front-96-atlas-state", schedule, { passive: true });
window.addEventListener("safari-day1-back-96-atlas-state", schedule, { passive: true });
