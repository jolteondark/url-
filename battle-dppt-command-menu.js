import { SAFARI_MOVE_PRESENTATION } from "./runtime/safari-move-presentation-live.js";

const byId = (id) => document.getElementById(id);

const TYPE_LABELS = Object.freeze({
  NORMAL:"ノーマル",FIRE:"ほのお",WATER:"みず",ELECTRIC:"でんき",GRASS:"くさ",ICE:"こおり",
  FIGHTING:"かくとう",POISON:"どく",GROUND:"じめん",FLYING:"ひこう",PSYCHIC:"エスパー",BUG:"むし",
  ROCK:"いわ",GHOST:"ゴースト",DRAGON:"ドラゴン",DARK:"あく",STEEL:"はがね",FAIRY:"フェアリー",
});

let lastPhase = null;
let lastTurn = null;
let gameMenuWasOpen = false;

function runtimeBattle() {
  return globalThis.__maplessSafariRuntime?.variables?.mapless?.battle ?? null;
}

function phaseOf(battle = runtimeBattle()) {
  if (!battle) return null;
  return battle.phase ?? null;
}

function visibleEnabled(selector, root = document) {
  return [...root.querySelectorAll(selector)].find((node) => !node.hidden && !node.disabled && node.getClientRects().length > 0) ?? null;
}

function moveFocusForMode(mode) {
  const card = byId("battle-card");
  if (!card || card.hidden) return;
  const active = document.activeElement;
  const activeIsBattleControl = active instanceof HTMLElement && card.contains(active);
  const activeIsHidden = activeIsBattleControl && (active.hidden || active.getClientRects().length === 0 || active.hasAttribute("disabled"));
  if (activeIsHidden) active.blur();

  let target = null;
  if (mode === "root") target = visibleEnabled('#dppt-command-root button[data-dppt-command="fight"]', card);
  if (mode === "fight") target = visibleEnabled('#moves button[data-move-id]', card) ?? visibleEnabled("#dppt-command-back", card);
  if (mode === "bag") target = visibleEnabled("#dppt-battle-bag button", card) ?? visibleEnabled("#dppt-command-back", card);
  if (mode === "result") target = visibleEnabled("#return-board", card);
  if (!target || document.activeElement === target) return;
  target.focus({ preventScroll:true });
}

function queueFocusForMode(mode) {
  requestAnimationFrame(() => moveFocusForMode(mode));
}

function ensureRoot() {
  const panel = byId("battle-card")?.querySelector(".battle-command-panel");
  if (!panel) return null;
  let root = byId("dppt-command-root");
  if (root) return root;
  root = document.createElement("div");
  root.id = "dppt-command-root";
  root.className = "dppt-command-root";
  root.innerHTML = `
    <button type="button" data-dppt-command="fight"><strong>たたかう</strong><small>FIGHT</small></button>
    <button type="button" data-dppt-command="bag"><strong>バッグ</strong><small>BAG</small></button>
    <button type="button" data-dppt-command="party"><strong>ポケモン</strong><small>POKÉMON</small></button>
    <button type="button" data-dppt-command="flee"><strong>にげる</strong><small>RUN</small></button>`;
  panel.append(root);
  return root;
}

function ensureBackButton() {
  const panel = byId("battle-card")?.querySelector(".battle-command-panel");
  if (!panel) return null;
  let back = byId("dppt-command-back");
  if (!back) {
    back = document.createElement("button");
    back.id = "dppt-command-back";
    back.type = "button";
    back.className = "dppt-command-back";
    back.textContent = "もどる";
    panel.append(back);
  }
  return back;
}

function ensureBagPanel() {
  const panel = byId("battle-card")?.querySelector(".battle-command-panel");
  if (!panel) return null;
  let bag = byId("dppt-battle-bag");
  if (bag) return bag;
  bag = document.createElement("div");
  bag.id = "dppt-battle-bag";
  bag.className = "dppt-battle-bag";
  bag.innerHTML = `
    <button type="button" data-dppt-bag="ball"><strong>モンスターボール</strong><small>捕獲</small></button>
    <button type="button" data-dppt-bag="items"><strong>どうぐ</strong><small>キズぐすり等</small></button>`;
  panel.append(bag);
  return bag;
}

function decorateMoves() {
  const moves = byId("moves");
  if (!moves) return;
  for (const button of moves.querySelectorAll("button[data-move-id]")) {
    const id = button.dataset.moveId;
    const details = SAFARI_MOVE_PRESENTATION[id];
    if (!details) continue;
    const type = String(details.type ?? "NORMAL").toUpperCase();
    button.dataset.dpptType = type;
    button.dataset.dpptCategory = String(details.category ?? "").toLowerCase();
    const meta = button.querySelector("small");
    if (!meta) continue;
    const ppMatch = meta.textContent.match(/PP\s+(\d+)/);
    const currentPp = ppMatch ? Number(ppMatch[1]) : details.totalPp;
    meta.className = "dppt-move-meta";
    meta.replaceChildren();
    const typeBadge = document.createElement("span");
    typeBadge.className = "dppt-move-type";
    typeBadge.textContent = TYPE_LABELS[type] ?? type;
    const pp = document.createElement("span");
    pp.className = "dppt-move-pp";
    pp.textContent = `PP ${currentPp}/${details.totalPp}`;
    meta.append(typeBadge, pp);
  }
}

function setMenu(mode) {
  const card = byId("battle-card");
  if (!card) return;
  card.dataset.dpptMenu = mode;
  const message = byId("battle-message");
  if (phaseOf() === "COMMAND" && message) {
    delete message.dataset.presentationOwner;
    message.textContent = mode === "root" ? "どうする？" : mode === "fight" ? "わざを えらんでください。" : mode === "bag" ? "バッグを えらんでください。" : message.textContent;
  }
  if (mode === "fight") decorateMoves();
  queueFocusForMode(mode);
  window.dispatchEvent(new CustomEvent("mapless-dppt-menu-changed", { detail: { mode } }));
}

function requestGameMenu(tab) {
  window.dispatchEvent(new CustomEvent("safari-game-menu-open-requested", { detail: { tab } }));
}

function returnToRootAfterGameMenuClose() {
  gameMenuWasOpen = false;
  const battle = runtimeBattle();
  if (!battle || phaseOf(battle) !== "COMMAND") return;
  setMenu("root");
}

function sync() {
  const battle = runtimeBattle();
  const card = byId("battle-card");
  if (!card) return;
  ensureRoot();
  ensureBackButton();
  ensureBagPanel();
  decorateMoves();
  if (!battle) {
    const active = document.activeElement;
    if (active instanceof HTMLElement && card.contains(active)) active.blur();
    delete card.dataset.dpptMenu;
    lastPhase = null;
    lastTurn = null;
    return;
  }
  const phase = phaseOf(battle);
  const turn = Number(battle.turn ?? 1);
  card.dataset.dpptPhase = phase ?? "";

  const enteredCommand = phase === "COMMAND" && lastPhase !== "COMMAND";
  const advancedTurn = phase === "COMMAND" && lastTurn != null && turn !== lastTurn;
  const gameMenu = byId("game-menu");
  const gameMenuOpen = Boolean(gameMenu && !gameMenu.hidden);
  const returnedFromGameMenu = gameMenuWasOpen && !gameMenuOpen && phase === "COMMAND";

  if (phase === "COMMAND") {
    if (enteredCommand || advancedTurn || returnedFromGameMenu || !["root", "fight", "bag"].includes(card.dataset.dpptMenu)) {
      setMenu("root");
    }
  } else if (phase === "RESULT") {
    card.dataset.dpptMenu = "result";
    if (lastPhase !== "RESULT") queueFocusForMode("result");
  } else {
    card.dataset.dpptMenu = "locked";
    const active = document.activeElement;
    if (active instanceof HTMLElement && card.contains(active)) active.blur();
  }

  const commandAllowed = phase === "COMMAND";
  for (const button of card.querySelectorAll("#dppt-command-root button,#dppt-command-back,#dppt-battle-bag button")) {
    button.disabled = !commandAllowed;
  }
  const ball = card.querySelector('[data-dppt-bag="ball"]');
  if (ball) ball.disabled = !commandAllowed || battle.kind !== "wild";
  const flee = card.querySelector('[data-dppt-command="flee"]');
  if (flee) {
    const canFlee = battle.kind === "wild" && battle.origin !== "village_bounty";
    flee.disabled = !commandAllowed || !canFlee;
  }

  lastPhase = phase;
  lastTurn = turn;
  gameMenuWasOpen = gameMenuOpen;
}

byId("battle-card")?.addEventListener("click", (event) => {
  const dpptControl = event.target.closest("[data-dppt-command],#dppt-command-back,[data-dppt-bag]");
  if (dpptControl && phaseOf() !== "COMMAND") {
    event.preventDefault();
    event.stopImmediatePropagation();
    return;
  }

  const command = event.target.closest("[data-dppt-command]");
  if (command) {
    const battle = runtimeBattle();
    if (!battle || phaseOf(battle) !== "COMMAND") return;
    const kind = command.dataset.dpptCommand;
    if (kind === "fight") return setMenu("fight");
    if (kind === "bag") return setMenu("bag");
    if (kind === "party") return requestGameMenu("party");
  }
  if (event.target.closest("#dppt-command-back")) return setMenu("root");
  const bag = event.target.closest("[data-dppt-bag]");
  if (bag?.dataset.dpptBag === "items") return requestGameMenu("bag");
  if (event.target.closest("#moves button[data-move-id]")) {
    queueMicrotask(() => {
      const card = byId("battle-card");
      if (card) card.dataset.dpptMenu = "locked";
    });
  }
}, true);

window.addEventListener("safari-runtime-changed", () => requestAnimationFrame(sync));
window.addEventListener("safari-preview-start", () => requestAnimationFrame(sync));
window.addEventListener("safari-game-menu-opened", () => requestAnimationFrame(sync));
window.addEventListener("safari-game-menu-closed", returnToRootAfterGameMenuClose);
window.addEventListener("pageshow", () => requestAnimationFrame(sync));
requestAnimationFrame(sync);
