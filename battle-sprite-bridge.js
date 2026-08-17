import "./game-presentation.js";
import { resolveSafariBattleSpriteAsset } from "./runtime/safari-battle-sprite-asset-subset.js";
import { projectSafariBattleSpriteImage } from "./runtime/safari-battle-sprite-image-presentation.js";

const SIDES = [
  { side: "player", nameId: "player-name", combatantId: "player-combatant", battlerIndex: 0 },
  { side: "foe", nameId: "foe-name", combatantId: "foe-combatant", battlerIndex: 1 },
];
let ownerBattlePresentation = null;

function ensureStyle() {
  if (document.getElementById("battle-sprite-bridge-style")) return;
  const s = document.createElement("style");
  s.id = "battle-sprite-bridge-style";
  s.textContent = ".battle-sprite-image{position:absolute;z-index:2;display:block;width:174px;height:174px;max-width:174px;max-height:174px;object-fit:contain;image-rendering:pixelated;opacity:1;pointer-events:none;filter:drop-shadow(0 14px 10px rgba(0,0,0,.28));transform-origin:50% 100%}.foe .battle-sprite-image{right:7px;bottom:4px}.player .battle-sprite-image{left:4px;bottom:8px}@media(max-width:520px){.battle-sprite-image{width:154px;height:154px;max-width:154px;max-height:154px}.foe .battle-sprite-image{right:2px;bottom:7px}.player .battle-sprite-image{left:-2px;bottom:11px}}@media(max-width:370px){.battle-sprite-image{width:140px;height:140px;max-width:140px;max-height:140px}}.battle-result-sheet{display:none;margin:4px 0 12px;padding:14px;border:1px solid rgba(119,214,188,.45);border-radius:17px;background:linear-gradient(145deg,rgba(18,57,58,.96),rgba(8,25,34,.98));box-shadow:0 18px 42px rgba(0,0,0,.32),inset 0 1px rgba(255,255,255,.07)}.battle-result-sheet.is-visible{display:block;animation:battle-result-in .26s ease both}@keyframes battle-result-in{from{opacity:0;transform:translateY(8px) scale(.985)}to{opacity:1;transform:none}}.battle-result-kicker{display:block;margin-bottom:3px;color:#8de0ca;font-size:.58rem;font-weight:950;letter-spacing:.18em}.battle-result-title{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:10px}.battle-result-title strong{font-size:1.18rem;letter-spacing:.02em}.battle-result-title span{color:#9fbac7;font-size:.65rem;font-weight:850}.battle-result-message{margin:0 0 12px;padding:10px 11px;border-radius:12px;background:rgba(2,13,20,.42);color:#e5f3f6;font-size:.83rem;font-weight:750;line-height:1.45}.battle-result-summary{display:grid;grid-template-columns:1fr 1fr;gap:8px}.battle-result-summary div{padding:9px 10px;border:1px solid rgba(111,151,169,.25);border-radius:11px;background:rgba(7,20,28,.42)}.battle-result-summary small{display:block;color:#7293a4;font-size:.52rem;font-weight:900;letter-spacing:.12em}.battle-result-summary strong{display:block;margin-top:3px;font-size:.78rem}.battle-result-sheet[data-result-tone=lost]{border-color:rgba(238,111,119,.48);background:linear-gradient(145deg,rgba(64,31,38,.97),rgba(19,24,33,.98))}.battle-result-sheet[data-result-tone=lost] .battle-result-kicker{color:#ff9ea5}.battle-result-sheet[data-result-tone=caught]{border-color:rgba(240,200,108,.52);background:linear-gradient(145deg,rgba(62,52,25,.97),rgba(20,27,31,.98))}.battle-result-sheet[data-result-tone=caught] .battle-result-kicker{color:#f5d77e}.battle-command-hud{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:9px;margin:0 0 10px;padding:10px;border:1px solid rgba(96,154,183,.42);border-radius:15px;background:linear-gradient(180deg,rgba(10,30,42,.96),rgba(5,18,28,.96));box-shadow:inset 0 1px rgba(255,255,255,.05),0 10px 24px rgba(0,0,0,.18)}.battle-command-side{min-width:0}.battle-command-side.foe{text-align:right}.battle-command-side small{display:block;color:#6f91a5;font-size:.49rem;font-weight:950;letter-spacing:.14em}.battle-command-side strong{display:block;overflow:hidden;margin-top:2px;color:#e9f5f8;font-size:.72rem;white-space:nowrap;text-overflow:ellipsis}.battle-command-side span{display:block;margin-top:2px;color:#8fb0c0;font-size:.61rem;font-weight:850}.battle-command-phase{display:grid;place-items:center;min-width:74px;padding:7px 8px;border:1px solid rgba(111,211,191,.28);border-radius:12px;background:rgba(15,62,60,.28);text-align:center}.battle-command-phase small{color:#75b9ac;font-size:.46rem;font-weight:950;letter-spacing:.14em}.battle-command-phase strong{margin-top:2px;color:#b9f0df;font-size:.68rem;letter-spacing:.05em}.battle-command-panel:has(.battle-command-hud){position:relative}.battle-command-hud[data-phase=result]{border-color:rgba(119,214,188,.42)}.battle-command-hud[data-phase=result] .battle-command-phase{background:rgba(46,92,78,.34)}@media(max-width:430px){.battle-result-sheet{margin:2px 0 10px;padding:12px}.battle-result-title strong{font-size:1.05rem}.battle-result-message{font-size:.78rem}.battle-result-summary{gap:6px}.battle-command-panel{position:sticky;bottom:0;z-index:14;padding-bottom:max(14px,env(safe-area-inset-bottom));background:linear-gradient(180deg,rgba(6,20,29,.97),rgba(5,15,23,.995));box-shadow:0 -18px 34px rgba(0,0,0,.3)}.battle-command-hud{margin-bottom:8px;padding:9px 8px;gap:6px;border-radius:13px}.battle-command-phase{min-width:66px;padding:6px}.battle-command-side strong{font-size:.68rem}.battle-command-side span{font-size:.57rem}.battle-actions button,.move-grid button{min-height:58px}}";
  document.head.append(s);
}

function ownerSide(side) {
  const value = ownerBattlePresentation?.[side];
  if (!value || typeof value.species !== "string" || !value.species) return null;
  if (!Number.isInteger(value.form) || value.form < 0) return null;
  return value;
}

function renderSide({ side, nameId, combatantId, battlerIndex }) {
  const owner = ownerSide(side);
  const species = owner?.species ?? document.getElementById(nameId)?.textContent?.trim();
  const form = owner?.form ?? 0;
  const c = document.getElementById(combatantId);
  if (!species || !c) return;
  const fallback = c.querySelector(".text-mon");
  let img = c.querySelector(".battle-sprite-image");
  const p = projectSafariBattleSpriteImage(
    resolveSafariBattleSpriteAsset({ species, form, battlerIndex }),
    { assetBase: "./" },
  );
  if (!p) {
    if (img) img.hidden = true;
    if (fallback) fallback.hidden = false;
    return;
  }
  if (!img) {
    img = document.createElement("img");
    img.className = "battle-sprite-image";
    img.alt = "";
    img.setAttribute("aria-hidden", "true");
    img.hidden = true;
    c.append(img);
  }
  const key = `${p.side}:${p.species}:${p.form}:${p.sha256}`;
  img.dataset.assetKey = key;
  img.dataset.canonicalPath = p.canonical_path;
  img.dataset.offsetX = String(p.offset_x);
  img.dataset.offsetY = String(p.offset_y);
  img.dataset.metricsId = p.metrics_id;
  img.dataset.sha256 = p.sha256;
  img.dataset.side = side;
  img.onload = () => {
    if (img.dataset.assetKey !== key) return;
    img.hidden = false;
    if (fallback) fallback.hidden = true;
  };
  img.onerror = () => {
    if (img.dataset.assetKey !== key) return;
    img.hidden = true;
    if (fallback) fallback.hidden = false;
  };
  if (img.getAttribute("src") !== p.src) {
    img.hidden = true;
    if (fallback) fallback.hidden = false;
    img.src = p.src;
  }
}

function renderSprites() {
  for (const side of SIDES) renderSide(side);
}

function ensureResultSheet() {
  const panel = document.querySelector("#battle-card .battle-command-panel");
  if (!panel) return null;
  let sheet = document.getElementById("battle-result-sheet");
  if (sheet) return sheet;
  sheet = document.createElement("section");
  sheet.id = "battle-result-sheet";
  sheet.className = "battle-result-sheet";
  sheet.setAttribute("aria-live", "polite");
  sheet.innerHTML = '<span class="battle-result-kicker">BATTLE COMPLETE</span><div class="battle-result-title"><strong id="battle-result-heading">戦闘終了</strong><span id="battle-result-kind">RESULT</span></div><p class="battle-result-message" id="battle-result-message"></p><div class="battle-result-summary"><div><small>YOUR POKÉMON</small><strong id="battle-result-player"></strong></div><div><small>FINAL HP</small><strong id="battle-result-hp"></strong></div></div>';
  const message = document.getElementById("battle-message");
  panel.insertBefore(sheet, message?.nextSibling ?? panel.firstChild);
  return sheet;
}

function renderBattleResult() {
  const sheet = ensureResultSheet();
  const card = document.getElementById("battle-card");
  const returnButton = document.getElementById("return-board");
  if (!sheet || !card || card.hidden || !returnButton || returnButton.hidden) {
    sheet?.classList.remove("is-visible");
    return;
  }
  const player = document.getElementById("player-name")?.textContent?.trim() || "Pokémon";
  const foe = document.getElementById("foe-name")?.textContent?.trim() || "Opponent";
  const hp = document.getElementById("player-hp")?.textContent?.trim() || "-";
  const foeHp = document.getElementById("foe-hp")?.textContent?.trim() || "-";
  const message = document.getElementById("battle-message")?.textContent?.trim() || "戦闘が終了しました。";
  const playerCurrent = Number.parseInt(hp, 10);
  const foeCurrent = Number.parseInt(foeHp, 10);
  const caught = /捕獲|つかま|caught|capture/i.test(message);
  const lost = Number.isFinite(playerCurrent) && playerCurrent <= 0 && !(Number.isFinite(foeCurrent) && foeCurrent <= 0);
  sheet.dataset.resultTone = caught ? "caught" : lost ? "lost" : "won";
  document.getElementById("battle-result-heading").textContent = caught ? `${foe}を捕獲` : lost ? "戦闘不能" : "勝利";
  document.getElementById("battle-result-kind").textContent = caught ? "CAPTURE" : lost ? "DEFEAT" : "VICTORY";
  document.getElementById("battle-result-message").textContent = message;
  document.getElementById("battle-result-player").textContent = player;
  document.getElementById("battle-result-hp").textContent = hp;
  sheet.classList.add("is-visible");
}

function ensureCommandHud() {
  const panel = document.querySelector("#battle-card .battle-command-panel");
  if (!panel) return null;
  let hud = document.getElementById("battle-command-hud");
  if (hud) return hud;
  hud = document.createElement("section");
  hud.id = "battle-command-hud";
  hud.className = "battle-command-hud";
  hud.setAttribute("aria-label", "戦闘状況");
  hud.innerHTML = '<div class="battle-command-side player"><small>YOU</small><strong id="command-player-name">-</strong><span id="command-player-hp">HP -</span></div><div class="battle-command-phase"><small>PHASE</small><strong id="command-phase">FIGHT</strong></div><div class="battle-command-side foe"><small>FOE</small><strong id="command-foe-name">-</strong><span id="command-foe-hp">HP -</span></div>';
  panel.prepend(hud);
  return hud;
}

function setCommandText(id, value) {
  const node = document.getElementById(id);
  if (node && node.textContent !== value) node.textContent = value;
}

function renderCommandHud() {
  const card = document.getElementById("battle-card");
  const hud = ensureCommandHud();
  if (!hud || !card || card.hidden) return;
  const playerName = document.getElementById("player-name")?.textContent?.trim() || "-";
  const foeName = document.getElementById("foe-name")?.textContent?.trim() || "-";
  const playerHp = document.getElementById("player-hp")?.textContent?.trim() || "-";
  const foeHp = document.getElementById("foe-hp")?.textContent?.trim() || "-";
  const result = !document.getElementById("return-board")?.hidden;
  setCommandText("command-player-name", playerName);
  setCommandText("command-foe-name", foeName);
  setCommandText("command-player-hp", `HP ${playerHp}`);
  setCommandText("command-foe-hp", `HP ${foeHp}`);
  setCommandText("command-phase", result ? "RESULT" : "FIGHT");
  const phase = result ? "result" : "fight";
  if (hud.dataset.phase !== phase) hud.dataset.phase = phase;
}

function renderBattlePresentation() {
  renderSprites();
  renderBattleResult();
  renderCommandHud();
}

window.addEventListener("safari-runtime-changed", (event) => {
  ownerBattlePresentation = event.detail?.battle ?? null;
  renderBattlePresentation();
}, { passive: true });

ensureStyle();
ensureCommandHud();
renderBattlePresentation();
const observer = new MutationObserver(renderBattlePresentation);
const battleCard = document.getElementById("battle-card");
if (battleCard) {
  observer.observe(battleCard, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["hidden", "style"],
  });
}
