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

function previewCommandBusy() {
  return Boolean(byId("capture")?.disabled);
}

function phaseFor(battle) {
  if (!battle) return null;
  // #turn remains the sole numeric turn owner. This pill communicates only the
  // input/presentation phase, so Safari never shows two competing Turn labels.
  // Bag turns are initiated outside #battle-card, so reuse preview's existing
  // command-busy signal instead of creating a second Bag-specific phase truth.
  if (resolving || previewCommandBusy()) return { key: "resolving", text: "行動処理中" };
  if (battle.completed) return { key: "result", text: "結果" };
  if (battle.player_replacement_required) return { key: "replacement", text: "交代選択" };
  return { key: "command", text: "コマンド選択" };
}

function updateBattleMessage(key) {
  const message = byId("battle-message");
  if (!message || key === "result") return;

  // preview-app owns concrete event narration while the submitted turn is being
  // presented. The phase guard only seeds the generic RESOLVING message; it
  // must not overwrite `EEVEEのたいあたり！` or later event messages.
  if (key === "resolving" && message.dataset.presentationOwner === "event") return;

  if (key !== "resolving") delete message.dataset.presentationOwner;
  const text = key === "resolving"
    ? "ターンを処理しています…"
    : key === "replacement"
      ? "次のポケモンを選んでください。"
      : "技を選んでください。";
  // Avoid observer feedback loops: textContent replacement can itself produce
  // a childList mutation in Safari, so write only when the phase text changed.
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
    if (resolving && !card.hidden) {
      paintPhaseOnly("resolving", "行動処理中");
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
  if (!battle) return Boolean(card?.hidden);

  const previewBusy = previewCommandBusy();
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
