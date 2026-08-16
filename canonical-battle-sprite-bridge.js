import { resolveInlineCanonicalBattleSprite } from "./runtime/safari-canonical-battle-sprite-inline.js";

let scheduled = false;
const SIDES = [
  { battlerIndex: 0, nameId: "player-name", combatantId: "player-combatant" },
  { battlerIndex: 1, nameId: "foe-name", combatantId: "foe-combatant" },
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

function renderSide({ battlerIndex, nameId, combatantId }) {
  const combatant = document.getElementById(combatantId);
  const species = document.getElementById(nameId)?.textContent?.trim();
  if (!combatant || !species) return;
  const asset = resolveInlineCanonicalBattleSprite({ species, form: Number(combatant.dataset.form ?? 0), battlerIndex });
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

function render() {
  scheduled = false;
  ensureStyle();
  const battle = document.getElementById("battle-card");
  if (!battle || battle.hidden) return;
  for (const side of SIDES) renderSide(side);
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(render);
}

ensureStyle();
render();
const battle = document.getElementById("battle-card");
if (battle) {
  // Observe semantic battle content only. Do not observe hidden/style changes
  // made by this renderer itself; doing so can create a self-triggering loop
  // on WebKit/Safari.
  new MutationObserver(schedule).observe(battle, {
    subtree: true,
    childList: true,
    characterData: true,
  });
}
window.addEventListener("pageshow", schedule, { passive: true });
window.addEventListener("safari-runtime-changed", schedule, { passive: true });
