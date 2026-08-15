import { resolveSafariBattleSpriteAsset } from "./runtime/safari-battle-sprite-asset-subset.js";
import { projectSafariBattleSpriteImage } from "./runtime/safari-battle-sprite-image-presentation.js";

const SIDES = Object.freeze([
  Object.freeze({ side: "player", nameId: "player-name", combatantId: "player-combatant", battlerIndex: 0 }),
  Object.freeze({ side: "foe", nameId: "foe-name", combatantId: "foe-combatant", battlerIndex: 1 }),
]);

function ensureStyle() {
  if (document.getElementById("battle-sprite-bridge-style")) return;
  const style = document.createElement("style");
  style.id = "battle-sprite-bridge-style";
  style.textContent = ".battle-sprite-image{position:absolute;z-index:0;display:block;max-width:96px;max-height:96px;object-fit:contain;image-rendering:pixelated;opacity:.94;pointer-events:none}.foe .battle-sprite-image{right:8px;bottom:6px}.player .battle-sprite-image{right:8px;top:24px}";
  document.head.append(style);
}

function renderSide({ side, nameId, combatantId, battlerIndex }) {
  const species = document.getElementById(nameId)?.textContent?.trim();
  const combatant = document.getElementById(combatantId);
  if (!species || !combatant) return;
  const fallback = combatant.querySelector(".text-mon");
  let image = combatant.querySelector(".battle-sprite-image");
  const asset = resolveSafariBattleSpriteAsset({ species, form: 0, battlerIndex });
  const presentation = projectSafariBattleSpriteImage(asset, { assetBase: "./" });

  if (!presentation) {
    if (image) image.hidden = true;
    if (fallback) fallback.hidden = false;
    return;
  }

  if (!image) {
    image = document.createElement("img");
    image.className = "battle-sprite-image";
    image.alt = "";
    image.setAttribute("aria-hidden", "true");
    image.hidden = true;
    combatant.append(image);
  }

  const key = `${presentation.side}:${presentation.species}:${presentation.form}:${presentation.sha256}`;
  image.dataset.assetKey = key;
  image.dataset.canonicalPath = presentation.canonical_path;
  image.dataset.offsetX = String(presentation.offset_x);
  image.dataset.offsetY = String(presentation.offset_y);
  image.dataset.metricsId = presentation.metrics_id;
  image.dataset.sha256 = presentation.sha256;
  image.dataset.side = side;
  image.onload = () => {
    if (image.dataset.assetKey !== key) return;
    image.hidden = false;
    if (fallback) fallback.hidden = true;
  };
  image.onerror = () => {
    if (image.dataset.assetKey !== key) return;
    image.hidden = true;
    if (fallback) fallback.hidden = false;
  };
  if (image.getAttribute("src") !== presentation.src) {
    image.hidden = true;
    if (fallback) fallback.hidden = false;
    image.src = presentation.src;
  }
}

function renderSprites() {
  for (const entry of SIDES) renderSide(entry);
}

ensureStyle();
renderSprites();
const observer = new MutationObserver(renderSprites);
const battleCard = document.getElementById("battle-card");
if (battleCard) observer.observe(battleCard, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["hidden"] });
