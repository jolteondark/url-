import "./party-storage-controls-bridge.js";
import { stampSafariSpeciesFormMetadata } from "./species-form-metadata-bridge.js";
import { applySafariSpeciesSprite } from "./runtime/safari-species-sprite-atlas.js";

let scheduled = false;

function ensureStyle() {
  if (document.getElementById("species-sprite-atlas-style")) return;
  const style = document.createElement("style");
  style.id = "species-sprite-atlas-style";
  style.textContent = `
    .atlas-battle-sprite{position:absolute;z-index:0;display:block;pointer-events:none;filter:drop-shadow(0 8px 7px rgba(0,0,0,.30))}
    .combatant.foe .atlas-battle-sprite{right:4px;bottom:-18px}
    .combatant.player .atlas-battle-sprite{right:4px;top:28px;transform:scaleX(-1)}
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
  const form = Number.isFinite(Number(root?.dataset?.form)) ? Number(root.dataset.form) : 0;
  return { species, form };
}

function ensureSprite(root, className, species, size, form = 0) {
  if (!root || !species) return false;
  let sprite = root.querySelector(`.${className}`);
  if (!sprite) {
    sprite = document.createElement("span");
    sprite.className = className;
    sprite.setAttribute("aria-hidden", "true");
    root.prepend(sprite);
  }
  sprite.dataset.spriteForm = String(form);
  const ok = applySafariSpeciesSprite(sprite, species, { size });
  sprite.hidden = !ok;
  return ok;
}

function renderBattle() {
  const battle = document.getElementById("battle-card");
  if (!battle || battle.hidden) return;
  for (const side of ["player", "foe"]) {
    const species = document.getElementById(`${side}-name`)?.textContent?.trim();
    const combatant = document.getElementById(`${side}-combatant`);
    if (!combatant || !species) continue;
    const ok = ensureSprite(combatant, "atlas-battle-sprite", species, 108, Number(combatant.dataset.form ?? 0));
    const fallback = combatant.querySelector(".text-mon");
    if (fallback) fallback.hidden = ok;
    const oldImage = combatant.querySelector(".battle-sprite-image");
    if (oldImage) oldImage.hidden = true;
  }
}

function renderParty() {
  document.querySelectorAll("#party-detail-grid .party-slot:not(.empty)").forEach((slot) => {
    const { species, form } = speciesMetadata(slot, ".party-slot-head strong");
    ensureSprite(slot, "atlas-party-sprite", species, 52, form);
  });
}

function renderStorage() {
  document.querySelectorAll("#storage-detail-boxes .storage-slot").forEach((slot) => {
    const { species, form } = speciesMetadata(slot, ".storage-slot-head strong");
    ensureSprite(slot, "atlas-storage-sprite", species, 44, form);
  });
}

function renderAll() {
  scheduled = false;
  ensureStyle();
  stampSafariSpeciesFormMetadata();
  renderBattle();
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
new MutationObserver(scheduleRender).observe(document.body, {
  subtree: true,
  childList: true,
  characterData: true,
  attributes: true,
  attributeFilter: ["hidden"],
});
window.addEventListener("pageshow", scheduleRender);
window.addEventListener("storage", scheduleRender);
window.addEventListener("safari-runtime-changed", scheduleRender);
