import { resolveInlineCanonicalBattleSprite } from "./runtime/safari-canonical-battle-sprite-inline.js";
import { resolveSafariCanonicalBugBattleSprite } from "./runtime/safari-canonical-battle-sprite-bug.js";
import { resolveSafariCanonicalFileBattleSprite } from "./runtime/safari-canonical-battle-sprite-assets.js";

let scheduled = false;
const SIDES = [
  { side: "player", battlerIndex: 0, nameId: "player-name", combatantId: "player-combatant" },
  { side: "foe", battlerIndex: 1, nameId: "foe-name", combatantId: "foe-combatant" },
];

function ensureStyle() {
  if (document.getElementById("canonical-battle-sprite-style")) return;
  const style = document.createElement("style");
  style.id = "canonical-battle-sprite-style";
  style.textContent = `
    .canonical-battle-sprite{position:absolute;z-index:3;display:block;object-fit:contain;pointer-events:none;filter:drop-shadow(0 12px 10px rgba(0,0,0,.28));image-rendering:auto}
    .combatant.foe .canonical-battle-sprite{width:168px;height:168px;right:16px;bottom:8px}
    .combatant.player .canonical-battle-sprite{width:184px;height:184px;left:6px;bottom:10px}
    @media(max-width:520px){
      .combatant.foe .canonical-battle-sprite{width:148px;height:148px;right:8px;bottom:9px}
      .combatant.player .canonical-battle-sprite{width:160px;height:160px;left:0;bottom:10px}
    }
  `;
  document.head.append(style);
}

function setHidden(node, hidden) {
  if (node && node.hidden !== hidden) node.hidden = hidden;
}

function ownerPokemon(side) {
  const runtime = globalThis.__maplessSafariRuntime;
  const battle = runtime?.variables?.mapless?.battle;
  if (!battle) return null;
  if (side === "foe") return battle.foe ?? null;
  const party = Array.isArray(runtime?.player?.party) ? runtime.player.party : [];
  const requestedIndex = Number(battle.player_party_index ?? 0);
  if (!Number.isInteger(requestedIndex) || requestedIndex < 0 || requestedIndex >= party.length) return null;
  return party[requestedIndex] ?? null;
}

function ownerIdentity(side) {
  const pokemon = ownerPokemon(side);
  const species = typeof pokemon?.species === "string" ? pokemon.species.trim() : "";
  if (!species) return null;
  const form = pokemon.form == null ? 0 : Number(pokemon.form);
  if (!Number.isInteger(form) || form < 0) return null;
  return { species, form };
}

function resolveCanonicalAsset({ species, form, battlerIndex }) {
  const inline = resolveInlineCanonicalBattleSprite({ species, form, battlerIndex });
  if (inline) return inline;
  const side = (battlerIndex & 1) === 0 ? "player" : "foe";
  const fileBacked = resolveSafariCanonicalFileBattleSprite({ species, form, side });
  if (fileBacked) return fileBacked;
  return resolveSafariCanonicalBugBattleSprite({ species, form, side });
}

function renderSide({ side, battlerIndex, nameId, combatantId }) {
  const combatant = document.getElementById(combatantId);
  if (!combatant) return;
  const owner = ownerIdentity(side);
  const species = owner?.species ?? document.getElementById(nameId)?.textContent?.trim();
  const form = owner?.form ?? Number(combatant.dataset.form ?? 0);
  if (!species) return;
  const asset = resolveCanonicalAsset({ species, form, battlerIndex });
  let image = combatant.querySelector(".canonical-battle-sprite");
  const fallback = combatant.querySelector(".text-mon");
  const legacy = combatant.querySelector(".battle-sprite-image");
  const atlas = combatant.querySelector(".atlas-battle-sprite");
  if (atlas) atlas.remove();
  if (!asset) {
    setHidden(image, true);
    setHidden(legacy, true);
    setHidden(fallback, false);
    return;
  }
  if (!image) {
    image = document.createElement("img");
    image.className = "canonical-battle-sprite";
    image.alt = "";
    image.setAttribute("aria-hidden", "true");
    image.decoding = "async";
    combatant.append(image);
  }
  const key = `${asset.side}:${asset.species}:${asset.form}:${asset.sha256}`;
  if (image.dataset.assetKey !== key) {
    image.dataset.assetKey = key;
    image.src = asset.src;
  }
  setHidden(image, false);
  setHidden(legacy, true);
  setHidden(fallback, true);
}

function battleCard() {
  return document.getElementById("battle-card");
}

function turnPresentationResolving(card = battleCard()) {
  return Boolean(card && !card.hidden && card.dataset.turnPhase === "resolving");
}

function render() {
  scheduled = false;
  ensureStyle();
  const battle = battleCard();
  if (!battle || battle.hidden) return;

  // Runtime state is committed before preview-app finishes playing the old
  // combatant's event queue. Keep the already rendered sprite stable until the
  // shared turn-phase contract leaves RESOLVING; otherwise a trainer reserve can
  // visually replace the foe before the defeated foe's hit/faint animation ends.
  if (turnPresentationResolving(battle)) return;

  for (const side of SIDES) renderSide(side);
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(render);
}

function installPhaseResync() {
  const card = battleCard();
  if (!card || typeof MutationObserver !== "function") return;
  const observer = new MutationObserver(() => {
    // Do not spin on repeated RESOLVING mutations. The one transition out of
    // RESOLVING schedules the runtime-owned sprite that is current at that time.
    if (!turnPresentationResolving(card)) schedule();
  });
  observer.observe(card, {
    attributes: true,
    attributeFilter: ["data-turn-phase", "hidden"],
  });
}

ensureStyle();
render();
installPhaseResync();
window.addEventListener("pageshow", schedule, { passive: true });
window.addEventListener("safari-runtime-changed", schedule, { passive: true });
