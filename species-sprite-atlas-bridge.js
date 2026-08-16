import { applySafariSpeciesSpriteWithManifest } from "./runtime/safari-species-sprite-manifest-resolver.js";

let scheduled = false;

function ensureStyle() {
  if (document.getElementById("species-sprite-atlas-style")) return;
  const style = document.createElement("style");
  style.id = "species-sprite-atlas-style";
  style.textContent = `
    .atlas-party-sprite,.atlas-storage-sprite{flex:0 0 auto;margin:2px 8px 4px 0;filter:drop-shadow(0 3px 3px rgba(0,0,0,.24))}
    .party-slot,.storage-slot{position:relative}
    .party-slot>.atlas-party-sprite,.storage-slot>.atlas-storage-sprite{float:left}
  `;
  document.head.append(style);
}

function speciesFromHeading(root, selector) {
  const text = root.querySelector(selector)?.textContent?.trim() ?? "";
  const match = text.match(/^\d+\.\s+(.+)$/);
  return match ? match[1].trim() : null;
}

function speciesMetadata(root, selector) {
  const species = root?.dataset?.species || speciesFromHeading(root, selector);
  const formValue = Number(root?.dataset?.form ?? 0);
  return { species, form: Number.isFinite(formValue) ? formValue : 0 };
}

function ensureSprite(root, className, species, { size, form = 0, family = "front" }) {
  if (!root || !species) return false;
  let sprite = root.querySelector(`.${className}`);
  if (!sprite) {
    sprite = document.createElement("span");
    sprite.className = className;
    sprite.setAttribute("aria-hidden", "true");
    root.prepend(sprite);
  }
  try {
    const ok = applySafariSpeciesSpriteWithManifest(sprite, species, { form, family, size });
    sprite.hidden = !ok;
    return ok;
  } catch (error) {
    console.error("Safari sprite render failed", { species, form, family, error });
    sprite.hidden = true;
    return false;
  }
}

function removeBattleAtlasSprites() {
  document.querySelectorAll("#battle-card .atlas-battle-sprite").forEach((sprite) => sprite.remove());
}

function renderParty() {
  document.querySelectorAll("#party-detail-grid .party-slot:not(.empty)").forEach((slot) => {
    const { species, form } = speciesMetadata(slot, ".party-slot-head strong");
    ensureSprite(slot, "atlas-party-sprite", species, { family: "icon", size: 48, form });
  });
}

function renderStorage() {
  document.querySelectorAll("#storage-detail-boxes .storage-slot").forEach((slot) => {
    const { species, form } = speciesMetadata(slot, ".storage-slot-head strong");
    ensureSprite(slot, "atlas-storage-sprite", species, { family: "icon", size: 44, form });
  });
}

function renderAll() {
  scheduled = false;
  ensureStyle();
  removeBattleAtlasSprites();
  renderParty();
  renderStorage();
}

function scheduleRender() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(renderAll);
}

ensureStyle();
renderAll();
const menu = document.getElementById("game-menu");
if (menu) {
  new MutationObserver(scheduleRender).observe(menu, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["hidden", "data-species", "data-form"],
  });
}
window.addEventListener("pageshow", scheduleRender);
window.addEventListener("storage", scheduleRender);
window.addEventListener("safari-runtime-changed", scheduleRender);
window.addEventListener("safari-species-form-front-atlas-state", scheduleRender);
