import "./party-storage-controls-bridge.js";
import {
  applySafariBattleBackSprite,
  applySafariBattleFrontSprite,
  applySafariMiniIconSprite,
} from "./runtime/safari-species-visuals.js";

let scheduled = false;

function ensureStyle() {
  if (document.getElementById("species-sprite-atlas-style")) return;
  const style = document.createElement("style");
  style.id = "species-sprite-atlas-style";
  style.textContent = `
    .atlas-battle-sprite{position:absolute;z-index:0;display:block;pointer-events:none;filter:drop-shadow(0 8px 7px rgba(0,0,0,.30))}
    .combatant.foe .atlas-battle-sprite{right:2px;bottom:-12px}
    .combatant.player .atlas-battle-sprite{right:2px;top:18px;transform:none}
    .atlas-party-sprite,.atlas-storage-sprite{flex:0 0 auto;display:block;margin:0 8px 4px 0;filter:drop-shadow(0 3px 3px rgba(0,0,0,.24))}
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

function ensureSprite(root, className) {
  let sprite = root.querySelector(`.${className}`);
  if (!sprite) {
    sprite = document.createElement("span");
    sprite.className = className;
    sprite.setAttribute("aria-hidden", "true");
    root.prepend(sprite);
  }
  return sprite;
}

function renderBattle() {
  const battle = document.getElementById("battle-card");
  if (!battle || battle.hidden) return;

  const foeSpecies = document.getElementById("foe-name")?.textContent?.trim();
  const foeCombatant = document.getElementById("foe-combatant");
  if (foeCombatant && foeSpecies) {
    const sprite = ensureSprite(foeCombatant, "atlas-battle-sprite");
    const ok = applySafariBattleFrontSprite(sprite, foeSpecies, { width: 128, height: 128 });
    sprite.hidden = !ok;
    const fallback = foeCombatant.querySelector(".text-mon");
    if (fallback) fallback.hidden = ok;
    const oldImage = foeCombatant.querySelector(".battle-sprite-image");
    if (oldImage) oldImage.hidden = true;
  }

  const playerSpecies = document.getElementById("player-name")?.textContent?.trim();
  const playerCombatant = document.getElementById("player-combatant");
  if (playerCombatant && playerSpecies) {
    const sprite = ensureSprite(playerCombatant, "atlas-battle-sprite");
    const ok = applySafariBattleBackSprite(sprite, playerSpecies, { width: 144, height: 144 });
    sprite.hidden = !ok;
    const fallback = playerCombatant.querySelector(".text-mon");
    if (fallback) fallback.hidden = ok;
    const oldImage = playerCombatant.querySelector(".battle-sprite-image");
    if (oldImage) oldImage.hidden = true;
  }
}

function renderParty() {
  document.querySelectorAll("#party-detail-grid .party-slot:not(.empty)").forEach((slot) => {
    const species = speciesFromHeading(slot, ".party-slot-head strong");
    const sprite = ensureSprite(slot, "atlas-party-sprite");
    const ok = applySafariMiniIconSprite(sprite, species, { width: 64, height: 32 });
    sprite.hidden = !ok;
  });
}

function renderStorage() {
  document.querySelectorAll("#storage-detail-boxes .storage-slot").forEach((slot) => {
    const species = speciesFromHeading(slot, ".storage-slot-head strong");
    const sprite = ensureSprite(slot, "atlas-storage-sprite");
    const ok = applySafariMiniIconSprite(sprite, species, { width: 56, height: 28 });
    sprite.hidden = !ok;
  });
}

function renderAll() {
  scheduled = false;
  ensureStyle();
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
