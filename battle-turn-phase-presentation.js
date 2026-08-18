const byId = (id) => document.getElementById(id);
let resolving = false;
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
  const shouldLock = locked || replacementRequired;
  const moves = byId("moves");
  const capture = byId("capture");
  const flee = byId("flee");
  if (moves) moves.inert = shouldLock;
  if (capture) capture.inert = shouldLock;
  if (flee) flee.inert = shouldLock;
  const panel = byId("battle-card")?.querySelector(".battle-command-panel");
  if (panel) panel.dataset.turnPhaseLocked = shouldLock ? "true" : "false";
}

function phaseFor(battle) {
  if (!battle) return null;
  // A submitted command owns the visible phase until preview-app has finished
  // presenting the whole turn. Battle state may already be terminal/replacement
  // while animations are still running, so RESOLVING takes precedence here.
  if (resolving) return { key: "resolving", text: `Turn ${Number(submittedTurn ?? battle.turn ?? 1)} • 行動処理中` };
  if (battle.completed) return { key: "result", text: "結果" };
  if (battle.player_replacement_required) return { key: "replacement", text: `Turn ${Number(battle.turn ?? 1)} • 交代選択` };
  return { key: "command", text: `Turn ${Number(battle.turn ?? 1)} • コマンド選択` };
}

function paintPhaseOnly(key, text) {
  const phase = ensurePhaseNode();
  const card = byId("battle-card");
  if (!phase || !card) return;
  phase.hidden = false;
  phase.textContent = text;
  phase.dataset.phase = key;
  card.dataset.turnPhase = key;
}

function renderPhase() {
  const battle = battleState();
  const card = byId("battle-card");
  if (!card) return;
  const phase = ensurePhaseNode();
  if (!battle) {
    if (resolving && !card.hidden) {
      paintPhaseOnly("resolving", `Turn ${Number(submittedTurn ?? 1)} • 行動処理中`);
      setCommandLock(true);
      return;
    }
    resolving = false;
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
  if (!resolving) return false;
  const battle = battleState();
  const card = byId("battle-card");

  // Successful flee may clear Battle before preview-app reaches its final render.
  // In that path capture.disabled can remain stale, so the card becoming hidden
  // is the reliable signal that the visible Battle presentation has finished.
  if (!battle) return Boolean(card?.hidden);

  const previewBusy = Boolean(byId("capture")?.disabled);
  if (previewBusy) return false;
  if (battle.completed || battle.player_replacement_required) return true;
  return Number(battle.turn ?? 0) !== Number(submittedTurn ?? 0);
}

function syncPhase() {
  syncFrame = 0;
  if (resolutionSettled()) {
    resolving = false;
    submittedTurn = null;
  }
  renderPhase();
  if (resolving) syncFrame = requestAnimationFrame(syncPhase);
}

function scheduleSync() {
  if (syncFrame) return;
  syncFrame = requestAnimationFrame(syncPhase);
}

const battleCard = byId("battle-card");
battleCard?.addEventListener("click", (event) => {
  const battle = battleState();
  const command = event.target.closest("#moves button[data-move-id],#capture,#flee");
  if (!command || !battle || battle.completed) return;

  if (resolving || battle.player_replacement_required) {
    event.preventDefault();
    event.stopImmediatePropagation();
    return;
  }

  resolving = true;
  submittedTurn = Number(battle.turn ?? 1);
  paintPhaseOnly("resolving", `Turn ${submittedTurn} • 行動処理中`);
  // Let the click that started this turn reach preview-app first. The microtask
  // runs before any second user input can dispatch, avoiding Safari cancelling
  // the initiating click when an element becomes inert during event capture.
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
