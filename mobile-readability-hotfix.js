import { applySafariSpeciesFormFrontSprite } from "./runtime/safari-species-form-front-atlas.js";

const STYLE_ID = "mapless-mobile-readability-hotfix";
let scheduled = false;

function ensureStyle() {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      html,body{max-width:100%;overflow-x:hidden!important}
      .app,.game-stage,.scene,.scene-heading,.hud,.board-grid,.board-cell,.battle-scene,.arena,.battle-command-panel,.move-grid,.battle-actions{min-width:0!important;max-width:100%!important}
      .notice,.board-cell strong,.battle-message,.move-grid strong,.move-grid small,.pokemon-name strong,.runtime-source,.log li{overflow-wrap:anywhere!important;word-break:break-word!important}
      .board-cell strong,.battle-message,.move-grid button,.battle-actions button,.hud strong,.hud span{min-width:0!important}
      .mapless-foe-atlas-hotfix{position:absolute;z-index:6;display:block;right:18px;bottom:8px;pointer-events:none;image-rendering:pixelated;filter:drop-shadow(0 5px 3px rgba(0,0,0,.2))}
      @media(max-width:600px){
        body{padding-left:max(4px,env(safe-area-inset-left))!important;padding-right:max(4px,env(safe-area-inset-right))!important;font-size:14px!important}
        .app{width:100%!important}
        .game-header{padding:5px 6px!important}
        .eyebrow{font-size:.54rem!important}.game-header h1{font-size:1rem!important}.run-chip{padding:4px 6px!important}
        .hud{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:3px!important}
        .hud>div,.hud .hud-button{padding:4px 2px!important;min-height:40px!important}
        .hud span{font-size:.48rem!important;letter-spacing:0!important}.hud strong{font-size:.68rem!important}
        .scene{padding:8px!important;border-radius:4px!important}
        .scene-heading{gap:6px!important;margin-bottom:6px!important}.scene-heading h2{font-size:1rem!important}.scene-kicker{font-size:.54rem!important}.mode-pill{font-size:.62rem!important;padding:3px 6px!important;min-height:24px!important}
        .notice{font-size:.8rem!important;margin:5px 0 8px!important;line-height:1.35!important}
        .board-grid{gap:5px!important}
        .board-cell{grid-template-columns:28px minmax(0,1fr)!important;gap:6px!important;min-height:64px!important;padding:7px!important;border-radius:5px!important}
        .cell-number{width:28px!important;height:28px!important;border-radius:4px!important;font-size:.68rem!important}
        .board-cell strong{font-size:.78rem!important;line-height:1.2!important}
        .primary-action-row button,.village-actions button,.shop-actions button,.village-shop-form button{min-height:44px!important;font-size:.8rem!important;border-radius:5px!important}
        #battle-card.battle-scene{width:100%!important;min-height:0!important}
        #battle-card .arena,.battle-scene .arena{height:min(48dvh,340px)!important;min-height:300px!important;overflow:visible!important}
        #battle-card .combatant{overflow:visible!important}
        #battle-card .battle-info-panel{max-width:52%!important;padding:5px 7px!important}
        #battle-card .pokemon-name strong{font-size:.72rem!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
        #battle-card .pokemon-name span,#battle-card .combatant small{font-size:.5rem!important}
        #battle-card .battle-command-panel,.battle-scene .battle-command-panel{display:block!important;min-height:0!important;width:100%!important}
        #battle-card .battle-message,.battle-scene .battle-message{display:block!important;width:100%!important;min-height:64px!important;padding:8px 9px!important;border-right:0!important;border-bottom:3px solid #39434d!important;font-size:.78rem!important;line-height:1.35!important}
        #battle-card .move-grid,.battle-scene .move-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;width:100%!important;padding:4px!important;gap:2px!important}
        #battle-card .move-grid button{min-height:54px!important;padding:6px!important}
        #battle-card .move-grid strong{font-size:.72rem!important;white-space:normal!important}
        #battle-card .move-grid small{font-size:.5rem!important;white-space:normal!important}
        #battle-card .battle-actions,.battle-scene .battle-actions{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;width:100%!important;padding:2px 4px 4px!important;gap:2px!important}
        #battle-card .battle-actions button{min-height:40px!important;padding:5px!important;font-size:.72rem!important}
        #battle-card .combatant.foe .canonical-battle-sprite{width:132px!important;height:132px!important;right:8px!important;bottom:6px!important}
        #battle-card .combatant.player .canonical-battle-sprite{width:142px!important;height:142px!important;left:0!important;bottom:6px!important}
        #battle-card .combatant.foe .canonical-battle-atlas-fallback{right:18px!important;bottom:14px!important;transform:scale(1.22)!important;transform-origin:center bottom!important}
        .mapless-foe-atlas-hotfix{right:18px;bottom:12px;transform:scale(1.22);transform-origin:center bottom}
      }
      @media(max-width:390px){
        .hud span{font-size:.44rem!important}.hud strong{font-size:.62rem!important}
        .board-cell{grid-template-columns:24px minmax(0,1fr)!important;padding:6px!important}.cell-number{width:24px!important;height:24px!important}.board-cell strong{font-size:.72rem!important}
        #battle-card .battle-info-panel{max-width:55%!important}
        #battle-card .combatant.foe .canonical-battle-sprite{width:120px!important;height:120px!important}
        #battle-card .combatant.player .canonical-battle-sprite{width:130px!important;height:130px!important}
      }
    `;
  }
  // Keep this presentation patch after asynchronously loaded battle CSS.
  if (document.head.lastElementChild !== style) document.head.append(style);
  return style;
}

function runtimeFoe() {
  return globalThis.__maplessSafariRuntime?.variables?.mapless?.battle?.foe ?? null;
}

function visibleCanonicalFoe(combatant, species) {
  const image = combatant?.querySelector(".canonical-battle-sprite");
  return Boolean(image && !image.hidden && image.complete && image.naturalWidth > 0 && image.dataset.spriteSpecies === species);
}

function ensureFoeAtlasFallback() {
  const card = document.getElementById("battle-card");
  const combatant = document.getElementById("foe-combatant");
  const foe = runtimeFoe();
  if (!card || card.hidden || !combatant || !foe?.species) return;
  const species = String(foe.species);
  const form = Number(foe.form ?? 0) || 0;
  let fallback = combatant.querySelector(".mapless-foe-atlas-hotfix");
  if (visibleCanonicalFoe(combatant, species)) {
    if (fallback) fallback.hidden = true;
    return;
  }
  if (!fallback) {
    fallback = document.createElement("span");
    fallback.className = "mapless-foe-atlas-hotfix";
    fallback.setAttribute("aria-hidden", "true");
    combatant.append(fallback);
  }
  const applied = applySafariSpeciesFormFrontSprite(fallback, species, { form, family: "front", size: 96 });
  fallback.hidden = !applied;
  if (applied) {
    fallback.dataset.spriteSpecies = species;
    const symbol = combatant.querySelector(".text-mon");
    if (symbol) symbol.hidden = true;
  }
}

function render() {
  scheduled = false;
  ensureStyle();
  ensureFoeAtlasFallback();
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(render);
}

ensureStyle();
schedule();
window.addEventListener("pageshow", schedule, { passive: true });
window.addEventListener("safari-runtime-changed", schedule, { passive: true });
window.addEventListener("safari-preview-start", schedule, { passive: true });
window.addEventListener("safari-species-form-front-atlas-state", schedule, { passive: true });
document.addEventListener("click", () => setTimeout(schedule, 0), { passive: true });
