import { SAFARI_MOVE_PRESENTATION } from "./runtime/safari-move-presentation-live.js";

const byId = (id) => document.getElementById(id);

const TYPE_LABELS = Object.freeze({
  NORMAL:"ノーマル",FIRE:"ほのお",WATER:"みず",ELECTRIC:"でんき",GRASS:"くさ",ICE:"こおり",
  FIGHTING:"かくとう",POISON:"どく",GROUND:"じめん",FLYING:"ひこう",PSYCHIC:"エスパー",BUG:"むし",
  ROCK:"いわ",GHOST:"ゴースト",DRAGON:"ドラゴン",DARK:"あく",STEEL:"はがね",FAIRY:"フェアリー",
});

function runtimeBattle() {
  return globalThis.__maplessSafariRuntime?.variables?.mapless?.battle ?? null;
}

function phaseOf(battle = runtimeBattle()) {
  if (!battle) return null;
  return battle.phase ?? (battle.completed ? "RESULT" : "COMMAND");
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
    delete card.dataset.dpptMenu;
    return;
  }
  const phase = phaseOf(battle);
  card.dataset.dpptPhase = phase ?? "";
  if (phase === "COMMAND" && !battle.player_replacement_required) {
    if (!["root", "fight", "bag"].includes(card.dataset.dpptMenu)) setMenu("root");
  } else if (phase === "RESULT") {
    card.dataset.dpptMenu = "result";
  } else {
    card.dataset.dpptMenu = "locked";
  }

  const commandAllowed = phase === "COMMAND" && !battle.completed && !battle.player_replacement_required;
  for (const button of card.querySelectorAll("#dppt-command-root button,#dppt-command-back,#dppt-battle-bag button")) {
    button.disabled = !commandAllowed;
  }
  const ball = card.querySelector('[data-dppt-bag="ball"]');
  if (ball) ball.disabled = !commandAllowed || battle.kind !== "wild" || byId("capture")?.disabled;
  const flee = card.querySelector('[data-dppt-command="flee"]');
  if (flee) flee.disabled = !commandAllowed || Boolean(byId("flee")?.disabled);
}

byId("battle-card")?.addEventListener("click", (event) => {
  const command = event.target.closest("[data-dppt-command]");
  if (command) {
    const battle = runtimeBattle();
    if (!battle || phaseOf(battle) !== "COMMAND") return;
    const kind = command.dataset.dpptCommand;
    if (kind === "fight") return setMenu("fight");
    if (kind === "bag") return setMenu("bag");
    if (kind === "party") return byId("menu-party")?.click();
    if (kind === "flee") return byId("flee")?.click();
  }
  if (event.target.closest("#dppt-command-back")) return setMenu("root");
  const bag = event.target.closest("[data-dppt-bag]");
  if (bag?.dataset.dpptBag === "ball") return byId("capture")?.click();
  if (bag?.dataset.dpptBag === "items") return byId("menu-bag")?.click();
  if (event.target.closest("#moves button[data-move-id]")) {
    queueMicrotask(() => {
      const card = byId("battle-card");
      if (card) card.dataset.dpptMenu = "locked";
    });
  }
}, true);

window.addEventListener("safari-runtime-changed", () => requestAnimationFrame(sync));
window.addEventListener("safari-preview-start", () => requestAnimationFrame(sync));
window.addEventListener("pageshow", () => requestAnimationFrame(sync));
if (typeof MutationObserver === "function") {
  new MutationObserver(() => requestAnimationFrame(sync)).observe(document.documentElement, { subtree:true, childList:true, attributes:true, attributeFilter:["hidden","disabled"] });
}
requestAnimationFrame(sync);
