const byId = (id) => document.getElementById(id);
let resolving = false;
let returning = false;
let submittedTurn = null;
let syncFrame = 0;

function battleState() {
  return globalThis.__maplessSafariRuntime?.variables?.mapless?.battle ?? null;
}

function ensurePhaseNode() {
  const topline = byId("battle-card")?.querySelector(".battle-topline");
  if (!topline) return null;
  let phase = byId("battle-phase");
  if (!phase) {
    phase = document.createElement("span");
    phase.id = "battle-phase";
    phase.className = "mode-pill battle-phase-pill";
    phase.setAttribute("aria-live", "polite");
    topline.append(phase);
  }
  return phase;
}

function setCommandLock(locked) {
  const battle = battleState();
  const replacementRequired = Boolean(battle?.player_replacement_required && !battle?.completed);
  const terminal = Boolean(battle?.completed);
  const shouldLock = locked || replacementRequired || terminal;
  const moves = byId("moves");
  const capture = byId("capture");
  const flee = byId("flee");
  const returnBoard = byId("return-board");
  if (moves) moves.inert = shouldLock;
  if (capture) {
    capture.inert = shouldLock;
    capture.disabled = shouldLock;
  }
  if (flee) {
    flee.inert = shouldLock;
    flee.disabled = shouldLock;
  }
  if (returnBoard) {
    returnBoard.inert = Boolean(locked || returning);
    returnBoard.disabled = Boolean(locked || returning);
  }
  const panel = byId("battle-card")?.querySelector(".battle-command-panel");
  if (panel) panel.dataset.turnPhaseLocked = shouldLock || returning ? "true" : "false";
}

function previewCommandBusy() {
  return Boolean(byId("capture")?.disabled);
}

function phaseFor(battle) {
  if (!battle) return null;
  if (returning) return { key: "resolving", text: "戻っています…" };
  if (battle.completed) return { key: "result", text: "結果" };
  if (battle.player_replacement_required) return { key: "replacement", text: "交代選択" };
  if (resolving || previewCommandBusy()) return { key: "resolving", text: "行動処理中" };
  return { key: "command", text: "コマンド選択" };
}

function updateBattleMessage(key) {
  const message = byId("battle-message");
  if (!message || key === "result") return;
  if (key === "resolving" && message.dataset.presentationOwner === "event") return;
  if (key !== "resolving") delete message.dataset.presentationOwner;
  const text = key === "resolving"
    ? returning ? "Day Boardへ戻っています…" : "ターンを処理しています…"
    : key === "replacement"
      ? "次のポケモンを選んでください。"
      : "技を選んでください。";
  if (message.textContent !== text) message.textContent = text;
}

function paintPhaseOnly(key, text) {
  const phase = ensurePhaseNode();
  const card = byId("battle-card");
  if (!phase || !card) return;
  phase.hidden = false;
  if (phase.textContent !== text) phase.textContent = text;
  phase.dataset.phase = key;
  card.dataset.turnPhase = key;
  updateBattleMessage(key);
}

function renderPhase() {
  const battle = battleState();
  const card = byId("battle-card");
  if (!card) return;
  const phase = ensurePhaseNode();
  if (!battle) {
    if ((resolving || returning) && !card.hidden) {
      paintPhaseOnly("resolving", returning ? "戻っています…" : "行動処理中");
      setCommandLock(true);
      return;
    }
    resolving = false;
    returning = false;
    submittedTurn = null;
    if (phase) phase.hidden = true;
    delete card.dataset.turnPhase;
    setCommandLock(false);
    return;
  }

  const current = phaseFor(battle);
  if (!current) return;
  paintPhaseOnly(current.key, current.text);
  setCommandLock(current.key === "resolving");
}

function resolutionSettled() {
  const battle = battleState();
  const card = byId("battle-card");
  if (returning) return !battle && Boolean(card?.hidden);
  if (!resolving) return false;
  if (!battle) return Boolean(card?.hidden);
  if (battle.completed || battle.player_replacement_required) return true;
  if (previewCommandBusy()) return false;
  return Number(battle.turn ?? 0) !== Number(submittedTurn ?? 0);
}

function syncPhase() {
  syncFrame = 0;
  if (resolutionSettled()) {
    resolving = false;
    returning = false;
    submittedTurn = null;
  }
  renderPhase();
  if (resolving || returning) syncFrame = requestAnimationFrame(syncPhase);
}

function scheduleSync() {
  if (syncFrame) return;
  syncFrame = requestAnimationFrame(syncPhase);
}

const battleCard = byId("battle-card");
battleCard?.addEventListener("click", (event) => {
  const battle = battleState();
  const returnCommand = event.target.closest("#return-board");
  const command = event.target.closest("#moves button[data-move-id],#capture,#flee");
  if ((!command && !returnCommand) || !battle) return;

  if (returnCommand) {
    if (!battle.completed) return;
    if (returning || resolving) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    returning = true;
    submittedTurn = null;
    paintPhaseOnly("resolving", "戻っています…");
    queueMicrotask(() => {
      setCommandLock(true);
      scheduleSync();
    });
    return;
  }

  if (battle.completed) return;
  if (resolving || returning || battle.player_replacement_required) {
    event.preventDefault();
    event.stopImmediatePropagation();
    return;
  }

  const message = byId("battle-message");
  if (message) delete message.dataset.presentationOwner;
  resolving = true;
  submittedTurn = Number(battle.turn ?? 1);
  paintPhaseOnly("resolving", "行動処理中");
  queueMicrotask(() => {
    setCommandLock(true);
    scheduleSync();
  });
}, true);

if (battleCard && typeof MutationObserver === "function") {
  const observer = new MutationObserver(scheduleSync);
  observer.observe(battleCard, { attributes: true, childList: true, subtree: true });
}

window.addEventListener("safari-runtime-changed", scheduleSync, { passive: true });
window.addEventListener("pageshow", scheduleSync, { passive: true });
scheduleSync();
