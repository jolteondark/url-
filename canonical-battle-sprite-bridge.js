import { shouldFreezeCanonicalBattleSprite } from "./battle-sprite-phase-gate.js";
import { resolveInlineCanonicalBattleSprite } from "./runtime/safari-canonical-battle-sprite-inline.js";
import { resolveSafariCanonicalBugBattleSprite } from "./runtime/safari-canonical-battle-sprite-bug.js";
import { resolveSafariCanonicalFileBattleSprite } from "./runtime/safari-canonical-battle-sprite-assets.js";
import { applySafariDay1Front96Sprite } from "./runtime/safari-day1-front-96-atlas.js?v=20260820-1334";

let scheduled = false;
const pendingLoads = new Map();
const failedDirectProbes = new Set();
const SIDES = [
  { side: "player", battlerIndex: 0, nameId: "player-name", combatantId: "player-combatant" },
  { side: "foe", battlerIndex: 1, nameId: "foe-name", combatantId: "foe-combatant" },
];

function ensureStyle() {
  if (document.getElementById("canonical-battle-sprite-style")) return;
  const style = document.createElement("style");
  style.id = "canonical-battle-sprite-style";
  style.textContent = `
    .canonical-battle-sprite{position:absolute;z-index:3;display:block;object-fit:contain;pointer-events:none;filter:drop-shadow(0 12px 10px rgba(0,0,0,.28));image-rendering:pixelated;opacity:1}
    .canonical-battle-atlas-fallback{position:absolute;z-index:3;display:block;pointer-events:none;filter:drop-shadow(0 8px 7px rgba(0,0,0,.24));opacity:.98;image-rendering:pixelated}
    .combatant.foe .canonical-battle-sprite{width:168px;height:168px;right:16px;bottom:8px}
    .combatant.player .canonical-battle-sprite{width:184px;height:184px;left:6px;bottom:10px}
    .combatant.foe .canonical-battle-atlas-fallback{right:34px;bottom:26px}
    .combatant.player .canonical-battle-atlas-fallback{left:42px;bottom:34px;transform:scale(1.14);transform-origin:center bottom}
    .combatant[data-sprite-loading="true"] .text-mon{display:block!important;opacity:.12}
    @media(max-width:520px){
      .combatant.foe .canonical-battle-sprite{width:148px;height:148px;right:8px;bottom:9px}
      .combatant.player .canonical-battle-sprite{width:160px;height:160px;left:0;bottom:10px}
      .combatant.foe .canonical-battle-atlas-fallback{right:26px;bottom:26px}
      .combatant.player .canonical-battle-atlas-fallback{left:30px;bottom:31px;transform:scale(1.08)}
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

function directProbeAsset(species, form, side) {
  const family = side === "player" ? "back" : "front";
  const suffix = form > 0 ? `_${form}` : "";
  const probeKey = `${family}:${species}:${form}`;
  if (failedDirectProbes.has(probeKey)) return null;
  return Object.freeze({
    species,
    form,
    side,
    probe: true,
    probeKey,
    sha256: "direct-probe",
    src: `./assets/canonical-battle-sprites/${family}/${species}${suffix}.png`,
  });
}

function resolveCanonicalAsset({ species, form, battlerIndex }) {
  const inline = resolveInlineCanonicalBattleSprite({ species, form, battlerIndex });
  if (inline) return inline;
  const side = (battlerIndex & 1) === 0 ? "player" : "foe";
  const fileBacked = resolveSafariCanonicalFileBattleSprite({ species, form, side });
  if (fileBacked) return fileBacked;
  const bug = resolveSafariCanonicalBugBattleSprite({ species, form, side });
  if (bug) return bug;
  return directProbeAsset(species, form, side);
}

function imageForAsset(asset) {
  const image = document.createElement("img");
  image.className = "canonical-battle-sprite";
  image.alt = "";
  image.setAttribute("aria-hidden", "true");
  image.decoding = "async";
  image.loading = "eager";
  image.fetchPriority = "high";
  image.dataset.assetKey = `${asset.side}:${asset.species}:${asset.form}:${asset.sha256 ?? asset.src}`;
  image.dataset.spriteSpecies = asset.species;
  return image;
}

function imageMatchesSpecies(image, species) {
  return Boolean(
    image
    && image.complete
    && image.naturalWidth > 0
    && (image.dataset.spriteSpecies === species || image.dataset.assetKey?.includes(`:${species}:`))
  );
}

function ensureAtlasFallback(combatant, species, symbol) {
  let fallback = combatant.querySelector(".canonical-battle-atlas-fallback");
  if (!fallback) {
    fallback = document.createElement("span");
    fallback.className = "canonical-battle-atlas-fallback";
    fallback.setAttribute("aria-hidden", "true");
    combatant.append(fallback);
  }
  const ok = applySafariDay1Front96Sprite(fallback, species, { size: 96 });
  setHidden(fallback, !ok);
  if (ok) {
    fallback.dataset.spriteSpecies = species;
    setHidden(symbol, true);
  }
  return ok;
}

function clearAtlasFallback(combatant) {
  setHidden(combatant.querySelector(".canonical-battle-atlas-fallback"), true);
}

function commitLoadedImage(combatant, candidate, symbol, legacy, key) {
  if (!combatant.isConnected || combatant.dataset.pendingSpriteKey !== key) return;
  const displayed = combatant.querySelector(".canonical-battle-sprite");
  if (displayed && displayed !== candidate) displayed.replaceWith(candidate);
  else if (!candidate.isConnected) combatant.append(candidate);
  delete combatant.dataset.pendingSpriteKey;
  delete combatant.dataset.spriteLoading;
  pendingLoads.delete(combatant.id);
  setHidden(candidate, false);
  setHidden(legacy, true);
  setHidden(symbol, true);
  clearAtlasFallback(combatant);
}

function showBestFallback(combatant, species, image, symbol, legacy) {
  const hasCurrentSpeciesImage = imageMatchesSpecies(image, species);
  setHidden(image, !hasCurrentSpeciesImage);
  setHidden(legacy, true);
  if (hasCurrentSpeciesImage) {
    clearAtlasFallback(combatant);
    setHidden(symbol, true);
    return;
  }
  if (!ensureAtlasFallback(combatant, species, symbol)) setHidden(symbol, false);
}

function beginAssetLoad(combatant, currentImage, asset, species, symbol, legacy) {
  const key = `${asset.side}:${asset.species}:${asset.form}:${asset.sha256 ?? asset.src}`;
  if (currentImage?.dataset.assetKey === key && imageMatchesSpecies(currentImage, species)) {
    delete combatant.dataset.pendingSpriteKey;
    delete combatant.dataset.spriteLoading;
    setHidden(currentImage, false);
    setHidden(legacy, true);
    setHidden(symbol, true);
    clearAtlasFallback(combatant);
    return;
  }
  if (combatant.dataset.pendingSpriteKey === key) return;

  combatant.dataset.pendingSpriteKey = key;
  combatant.dataset.spriteLoading = "true";
  showBestFallback(combatant, species, currentImage, symbol, legacy);

  const candidate = imageForAsset(asset);
  pendingLoads.set(combatant.id, candidate);
  candidate.addEventListener("load", () => commitLoadedImage(combatant, candidate, symbol, legacy, key), { once: true });
  candidate.addEventListener("error", () => {
    if (combatant.dataset.pendingSpriteKey !== key) return;
    if (asset.probe && asset.probeKey) failedDirectProbes.add(asset.probeKey);
    delete combatant.dataset.pendingSpriteKey;
    delete combatant.dataset.spriteLoading;
    pendingLoads.delete(combatant.id);
    showBestFallback(combatant, species, combatant.querySelector(".canonical-battle-sprite"), symbol, legacy);
  }, { once: true });
  candidate.src = asset.src;
  if (candidate.complete && candidate.naturalWidth > 0) commitLoadedImage(combatant, candidate, symbol, legacy, key);
}

function renderSide({ side, battlerIndex, nameId, combatantId }) {
  const combatant = document.getElementById(combatantId);
  if (!combatant) return;
  const owner = ownerIdentity(side);
  const species = owner?.species ?? document.getElementById(nameId)?.textContent?.trim();
  const form = owner?.form ?? Number(combatant.dataset.form ?? 0);
  if (!species) return;
  const image = combatant.querySelector(".canonical-battle-sprite");
  const symbol = combatant.querySelector(".text-mon");
  const legacy = combatant.querySelector(".battle-sprite-image");
  combatant.querySelector(".atlas-battle-sprite")?.remove();
  const asset = resolveCanonicalAsset({ species, form, battlerIndex });
  if (!asset) {
    delete combatant.dataset.pendingSpriteKey;
    delete combatant.dataset.spriteLoading;
    pendingLoads.delete(combatant.id);
    showBestFallback(combatant, species, image, symbol, legacy);
    return;
  }
  beginAssetLoad(combatant, image, asset, species, symbol, legacy);
}

function hasVisibleSprite(combatant) {
  const side = combatant?.classList.contains("player") ? "player" : "foe";
  const species = ownerIdentity(side)?.species;
  const image = combatant?.querySelector(".canonical-battle-sprite");
  if (species && imageMatchesSpecies(image, species) && !image.hidden) return true;
  const fallback = combatant?.querySelector(".canonical-battle-atlas-fallback");
  return Boolean(fallback && !fallback.hidden && fallback.dataset.spriteSpecies === species && fallback.style.backgroundImage);
}

function render() {
  scheduled = false;
  const battle = document.getElementById("battle-card");
  if (!battle || battle.hidden) return;
  ensureStyle();
  const freezeExisting = shouldFreezeCanonicalBattleSprite(battle);
  for (const side of SIDES) {
    const combatant = document.getElementById(side.combatantId);
    if (freezeExisting && hasVisibleSprite(combatant)) continue;
    renderSide(side);
  }
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(render);
}

function installPhaseResync() {
  const card = document.getElementById("battle-card");
  if (!card || typeof MutationObserver !== "function") return;
  new MutationObserver(schedule).observe(card, { attributes: true, attributeFilter: ["data-turn-phase", "hidden"] });
}

ensureStyle();
render();
installPhaseResync();
window.addEventListener("pageshow", schedule, { passive: true });
window.addEventListener("safari-runtime-changed", schedule, { passive: true });
window.addEventListener("safari-preview-start", schedule, { passive: true });
window.addEventListener("safari-day1-front-96-atlas-state", schedule, { passive: true });
