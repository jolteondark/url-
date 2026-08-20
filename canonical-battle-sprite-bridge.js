import { shouldFreezeCanonicalBattleSprite } from "./battle-sprite-phase-gate.js";
import { resolveInlineCanonicalBattleSprite } from "./runtime/safari-canonical-battle-sprite-inline.js";
import { resolveSafariCanonicalBugBattleSprite } from "./runtime/safari-canonical-battle-sprite-bug.js";
import { resolveSafariCanonicalFileBattleSprite } from "./runtime/safari-canonical-battle-sprite-assets.js";
import { applySafariSpeciesSprite } from "./runtime/safari-species-sprite-atlas.js";

let scheduled = false;
const pendingLoads = new Map();
const SIDES = [
  { side: "player", battlerIndex: 0, nameId: "player-name", combatantId: "player-combatant" },
  { side: "foe", battlerIndex: 1, nameId: "foe-name", combatantId: "foe-combatant" },
];

function ensureStyle() {
  if (document.getElementById("canonical-battle-sprite-style")) return;
  const style = document.createElement("style");
  style.id = "canonical-battle-sprite-style";
  style.textContent = `
    .canonical-battle-sprite,.canonical-battle-atlas-fallback{position:absolute;z-index:3;display:block;pointer-events:none;filter:drop-shadow(0 12px 10px rgba(0,0,0,.28));image-rendering:pixelated}
    .canonical-battle-sprite{object-fit:contain}
    .combatant.foe .canonical-battle-sprite,.combatant.foe .canonical-battle-atlas-fallback{width:168px!important;height:168px!important;right:16px;bottom:8px}
    .combatant.player .canonical-battle-sprite,.combatant.player .canonical-battle-atlas-fallback{width:184px!important;height:184px!important;left:6px;bottom:10px}
    @media(max-width:520px){
      .combatant.foe .canonical-battle-sprite,.combatant.foe .canonical-battle-atlas-fallback{width:148px!important;height:148px!important;right:8px;bottom:9px}
      .combatant.player .canonical-battle-sprite,.combatant.player .canonical-battle-atlas-fallback{width:160px!important;height:160px!important;left:0;bottom:10px}
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
  const index = Number(battle.player_party_index ?? 0);
  return Number.isInteger(index) && index >= 0 && index < party.length ? party[index] : null;
}

function ownerIdentity(side) {
  const pokemon = ownerPokemon(side);
  const species = typeof pokemon?.species === "string" ? pokemon.species.trim() : "";
  if (!species) return null;
  const form = pokemon.form == null ? 0 : Number(pokemon.form);
  return { species, form: Number.isInteger(form) && form >= 0 ? form : 0 };
}

function resolveCanonicalAsset({ species, form, battlerIndex }) {
  const inline = resolveInlineCanonicalBattleSprite({ species, form, battlerIndex });
  if (inline) return inline;
  const side = (battlerIndex & 1) === 0 ? "player" : "foe";
  return resolveSafariCanonicalFileBattleSprite({ species, form, side })
    ?? resolveSafariCanonicalBugBattleSprite({ species, form, side });
}

function ensureAtlasFallback(combatant, species) {
  let atlas = combatant.querySelector(".canonical-battle-atlas-fallback");
  if (!atlas) {
    atlas = document.createElement("span");
    atlas.className = "canonical-battle-atlas-fallback";
    atlas.setAttribute("aria-hidden", "true");
    combatant.append(atlas);
  }
  const side = combatant.classList.contains("player") ? "player" : "foe";
  const size = side === "player" ? 184 : 168;
  const ok = applySafariSpeciesSprite(atlas, species, { size });
  setHidden(atlas, !ok);
  return ok ? atlas : null;
}

function imageForAsset(asset) {
  const image = document.createElement("img");
  image.className = "canonical-battle-sprite";
  image.alt = "";
  image.setAttribute("aria-hidden", "true");
  image.decoding = "async";
  image.loading = "eager";
  image.fetchPriority = "high";
  image.dataset.assetKey = `${asset.side}:${asset.species}:${asset.form}:${asset.sha256}`;
  return image;
}

function showAtlasOrSymbol(combatant, species, image, legacy, symbol) {
  const atlas = ensureAtlasFallback(combatant, species);
  setHidden(image, true);
  setHidden(legacy, true);
  setHidden(symbol, Boolean(atlas));
  return atlas;
}

function commitLoadedImage(combatant, candidate, legacy, symbol, key) {
  if (!combatant.isConnected || combatant.dataset.pendingSpriteKey !== key) return;
  const displayed = combatant.querySelector(".canonical-battle-sprite");
  if (displayed && displayed !== candidate) displayed.replaceWith(candidate);
  else if (!candidate.isConnected) combatant.append(candidate);
  delete combatant.dataset.pendingSpriteKey;
  pendingLoads.delete(combatant.id);
  setHidden(candidate, false);
  setHidden(legacy, true);
  setHidden(symbol, true);
  setHidden(combatant.querySelector(".canonical-battle-atlas-fallback"), true);
}

function beginAssetLoad(combatant, currentImage, asset, species, legacy, symbol) {
  const key = `${asset.side}:${asset.species}:${asset.form}:${asset.sha256}`;
  if (currentImage?.dataset.assetKey === key && currentImage.complete && currentImage.naturalWidth > 0) {
    delete combatant.dataset.pendingSpriteKey;
    setHidden(currentImage, false);
    setHidden(legacy, true);
    setHidden(symbol, true);
    setHidden(combatant.querySelector(".canonical-battle-atlas-fallback"), true);
    return;
  }
  if (combatant.dataset.pendingSpriteKey === key) return;

  combatant.dataset.pendingSpriteKey = key;
  const hasCurrent = Boolean(currentImage?.complete && currentImage.naturalWidth > 0);
  if (!hasCurrent) showAtlasOrSymbol(combatant, species, currentImage, legacy, symbol);

  const candidate = imageForAsset(asset);
  pendingLoads.set(combatant.id, candidate);
  candidate.addEventListener("load", () => commitLoadedImage(combatant, candidate, legacy, symbol, key), { once: true });
  candidate.addEventListener("error", () => {
    if (combatant.dataset.pendingSpriteKey !== key) return;
    delete combatant.dataset.pendingSpriteKey;
    pendingLoads.delete(combatant.id);
    showAtlasOrSymbol(combatant, species, combatant.querySelector(".canonical-battle-sprite"), legacy, symbol);
  }, { once: true });
  candidate.src = asset.src;
  if (candidate.complete && candidate.naturalWidth > 0) commitLoadedImage(combatant, candidate, legacy, symbol, key);
}

function renderSide({ side, battlerIndex, nameId, combatantId }) {
  const combatant = document.getElementById(combatantId);
  if (!combatant) return;
  const owner = ownerIdentity(side);
  const species = owner?.species ?? document.getElementById(nameId)?.textContent?.trim();
  const form = owner?.form ?? Number(combatant.dataset.form ?? 0);
  if (!species) return;

  const asset = resolveCanonicalAsset({ species, form, battlerIndex });
  const image = combatant.querySelector(".canonical-battle-sprite");
  const symbol = combatant.querySelector(".text-mon");
  const legacy = combatant.querySelector(".battle-sprite-image");
  combatant.querySelector(".atlas-battle-sprite")?.remove();

  if (!asset) {
    delete combatant.dataset.pendingSpriteKey;
    pendingLoads.delete(combatant.id);
    showAtlasOrSymbol(combatant, species, image, legacy, symbol);
    return;
  }
  beginAssetLoad(combatant, image, asset, species, legacy, symbol);
}

function render() {
  scheduled = false;
  ensureStyle();
  const card = document.getElementById("battle-card");
  if (!card || card.hidden || shouldFreezeCanonicalBattleSprite(card)) return;
  for (const side of SIDES) renderSide(side);
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(render);
}

function installPhaseResync() {
  const card = document.getElementById("battle-card");
  if (!card || typeof MutationObserver !== "function") return;
  new MutationObserver(() => {
    if (!shouldFreezeCanonicalBattleSprite(card)) schedule();
  }).observe(card, { attributes: true, attributeFilter: ["data-turn-phase", "hidden"] });
}

ensureStyle();
render();
installPhaseResync();
window.addEventListener("pageshow", schedule, { passive: true });
window.addEventListener("safari-runtime-changed", schedule, { passive: true });
window.addEventListener("safari-preview-start", schedule, { passive: true });
