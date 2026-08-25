import { applySafariDay1Back96Sprite } from "./runtime/safari-day1-back-96-atlas.js?v=20260825-1042";
import { applySafariSpeciesFormFrontSprite } from "./runtime/safari-species-form-front-atlas.js?v=20260825-1042";

let scheduled = false;

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
  const card = document.getElementById("battle-card");
  const combatant = document.getElementById("player-combatant");
  if (!card || card.hidden || !combatant) return;
  const pokemon = playerPokemon();
  const species = typeof pokemon?.species === "string" ? pokemon.species.trim() : "";
  const rawForm = Number(pokemon?.form ?? 0);
  const form = Number.isInteger(rawForm) && rawForm >= 0 ? rawForm : 0;
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

  const backApplied = applySafariDay1Back96Sprite(fallback, species, { size: 96 });
  const broadApplied = backApplied
    ? false
    : applySafariSpeciesFormFrontSprite(fallback, species, {
        form,
        family: "back-fallback-front",
        size: 96,
      });
  if (!backApplied && !broadApplied) return;
  fallback.hidden = false;
  fallback.dataset.spriteSpecies = species;
  fallback.dataset.battleSpriteFallback = backApplied ? "canonical-back-96" : "species-form-front-for-back";
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
    attributeFilter: ["hidden", "data-turn-phase", "data-sprite-loading"],
  });
}

render();
installObserver();
window.addEventListener("pageshow", schedule, { passive: true });
window.addEventListener("safari-runtime-changed", schedule, { passive: true });
window.addEventListener("safari-preview-start", schedule, { passive: true });
window.addEventListener("safari-day1-front-96-atlas-state", schedule, { passive: true });
window.addEventListener("safari-day1-back-96-atlas-state", schedule, { passive: true });
window.addEventListener("safari-species-form-front-atlas-state", schedule, { passive: true });
