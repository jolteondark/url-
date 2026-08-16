import { applySafariSpeciesSpriteWithManifest } from "./runtime/safari-species-sprite-manifest-resolver.js";

let scheduled = false;

function ensureStyle() {
  if (document.getElementById("species-sprite-atlas-style")) return;
  const style = document.createElement("style");
  style.id = "species-sprite-atlas-style";
  style.textContent = `
    .atlas-battle-sprite{position:absolute;z-index:1;display:block;pointer-events:none;filter:drop-shadow(0 8px 7px rgba(0,0,0,.30))}
    .combatant.foe .atlas-battle-sprite{right:48px;bottom:22px}
    .combatant.player .atlas-battle-sprite{left:48px;bottom:28px}
    .combatant.player .atlas-battle-sprite[data-sprite-family="back"][data-sprite-exact-form-asset="false"]{transform:scaleX(-1)}
    .atlas-party-sprite,.atlas-storage-sprite{flex:0 0 auto;margin:2px 8px 4px 0;filter:drop-shadow(0 3px 3px rgba(0,0,0,.24))}
    .party-slot,.storage-slot{position:relative}
    .party-slot>.atlas-party-sprite,.storage-slot>.atlas-storage-sprite{float:left}
    @media(max-width:520px){
      .combatant.foe .atlas-battle-sprite{right:26px;bottom:18px}
      .combatant.player .atlas-battle-sprite{left:26px;bottom:24px}
    }
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

function renderBattle() {
  const battle = document.getElementById("battle-card");
  if (!battle || battle.hidden) return;

  const foe = document.getElementById("foe-combatant");
  const foeSpecies = document.getElementById("foe-name")?.textContent?.trim();
  if (foe && foeSpecies) {
    const ok = ensureSprite(foe, "atlas-battle-sprite", foeSpecies, {
      family: "front",
      size: 108,
      form: Number(foe.dataset.form ?? 0),
    });
    const fallback = foe.querySelector(".text-mon");
    if (fallback) fallback.hidden = ok;
    const oldImage = foe.querySelector(".battle-sprite-image");
    if (oldImage) oldImage.hidden = true;
  }

  const player = document.getElementById("player-combatant");
  const playerSpecies = document.getElementById("player-name")?.textContent?.trim();
  if (player && playerSpecies) {
    const ok = ensureSprite(player, "atlas-battle-sprite", playerSpecies, {
      family: "back",
      size: 112,
      form: Number(player.dataset.form ?? 0),
    });
    const fallback = player.querySelector(".text-mon");
    if (fallback) fallback.hidden = ok;
    const oldImage = player.querySelector(".battle-sprite-image");
    if (oldImage) oldImage.hidden = true;
  }
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
  attributeFilter: ["hidden", "data-species", "data-form"],
});
window.addEventListener("pageshow", scheduleRender);
window.addEventListener("storage", scheduleRender);
window.addEventListener("safari-runtime-changed", scheduleRender);
window.addEventListener("safari-species-form-front-atlas-state", scheduleRender);
