const byId = (id) => document.getElementById(id);
let presentationAction = null;
let syncFrame = 0;

const COMMAND = "COMMAND";
const REPLACEMENT = "REPLACEMENT";
const RESULT = "RESULT";
const RETURN = "RETURN";
const LEGACY_TERMINAL_PHASES = new Set([COMMAND, REPLACEMENT, RESULT]);

function battleState() {
  return globalThis.__maplessSafariRuntime?.variables?.mapless?.battle ?? null;
}

function rawOwnerPhase(battle) {
  if (!battle) return null;
  if (typeof battle.phase === "string" && battle.phase) return battle.phase;
  // Thin compatibility adapter for boundary/older persisted battles that predate
  // the central orchestrator. Normal Battle UI must otherwise use battle.phase.
  if (battle.completed) return RESULT;
  if (battle.player_replacement_required) return REPLACEMENT;
  return COMMAND;
}

function previewCompatibilityBusy(phase) {
  if (phase === RESULT) return Boolean(byId("return-board")?.disabled);
  return Boolean(byId("capture")?.disabled);
}

function previousOwnerPhase(battle, phase) {
  const trace = Array.isArray(battle?.phase_trace) ? battle.phase_trace : [];
  for (let index = trace.length - 1; index >= 0; index -= 1) {
    const candidate = trace[index]?.phase;
    if (candidate && candidate !== phase && candidate !== COMMAND) return candidate;
  }
  return phase;
}

function visibleOwnerPhase(battle) {
  const phase = rawOwnerPhase(battle);
  // preview-app still owns a generic async submit mutex. During the small
  // compatibility window after the orchestrator has already reached its final
  // COMMAND/REPLACEMENT/RESULT phase but the ordered presentation queue is still
  // draining, keep showing the preceding orchestrator phase from phase_trace.
  // No synthetic RESOLVING phase is created here.
  if (battle?.phase && LEGACY_TERMINAL_PHASES.has(phase) && previewCompatibilityBusy(phase)) {
    return previousOwnerPhase(battle, phase);
  }
  return phase;
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

function commandAllowed(battle) {
  return rawOwnerPhase(battle) === COMMAND && !previewCompatibilityBusy(COMMAND);
}

function returnAllowed(battle) {
  return rawOwnerPhase(battle) === RESULT && !previewCompatibilityBusy(RESULT);
}

function setCommandLock(battle) {
  const allowCommand = commandAllowed(battle);
  const allowReturn = returnAllowed(battle);
  const moves = byId("moves");
  const capture = byId("capture");
  const flee = byId("flee");
  const returnBoard = byId("return-board");
  if (moves) moves.inert = !allowCommand;
  if (capture) capture.inert = !allowCommand;
  if (flee) flee.inert = !allowCommand;
  if (returnBoard) returnBoard.inert = !allowReturn;
  const panel = byId("battle-card")?.querySelector(".battle-command-panel");
  if (panel) panel.dataset.turnPhaseLocked = allowCommand || allowReturn ? "false" : "true";
}

function actionText(action) {
  if (action === "player") return "味方action処理中";
  if (action === "foe") return "相手action処理中";
  if (action === "sendout") return "交代演出中";
  if (action === "item") return "アイテム処理中";
  if (action === "capture") return "捕獲処理中";
  if (action === "flee") return "逃走処理中";
  if (action === "automatic") return "自動効果処理中";
  return null;
}

function phaseText(phase) {
  if (presentationAction && phase !== COMMAND && phase !== RESULT && phase !== RETURN) {
    return actionText(presentationAction) ?? phase;
  }
  switch (phase) {
    case COMMAND: return "コマンド選択";
    case "ACTION_1": return "第1行動";
    case "CHECK_1": return "第1行動判定";
    case "ACTION_2": return "第2行動";
    case "CHECK_2": return "第2行動判定";
    case "POST_FAINT": return "戦闘不能処理";
    case REPLACEMENT: return "交代選択";
    case "POST_VICTORY": return "勝敗確定";
    case "REWARD_GROWTH": return "成長・報酬処理";
    case RESULT: return "結果";
    case RETURN: return "戻っています…";
    default: return phase ?? "Battle";
  }
}

function updateBattleMessage(phase) {
  const message = byId("battle-message");
  if (!message || phase === RESULT) return;
  if (message.dataset.presentationOwner === "event" && phase !== COMMAND && phase !== REPLACEMENT) return;
  if (phase === COMMAND) {
    delete message.dataset.presentationOwner;
    message.textContent = "技を選んでください。";
  } else if (phase === REPLACEMENT) {
    delete message.dataset.presentationOwner;
    message.textContent = "次のポケモンを選んでください。";
  } else if (phase === RETURN) {
    message.textContent = "Day Boardへ戻っています…";
  } else if (message.dataset.presentationOwner !== "event") {
    message.textContent = "ターンを処理しています…";
  }
}

function renderPhase() {
  const battle = battleState();
  const card = byId("battle-card");
  if (!card) return;
  const node = ensurePhaseNode();
  if (!battle) {
    presentationAction = null;
    if (node) node.hidden = true;
    delete card.dataset.turnPhase;
    delete card.dataset.turnAction;
    setCommandLock(null);
    return;
  }

  const phase = visibleOwnerPhase(battle);
  if (!phase) return;
  if (node) {
    node.hidden = false;
    node.textContent = phaseText(phase);
    node.dataset.phase = phase.toLowerCase();
  }
  card.dataset.turnPhase = phase.toLowerCase();
  if (presentationAction && phase !== COMMAND && phase !== RESULT && phase !== RETURN) {
    card.dataset.turnAction = presentationAction;
  } else {
    delete card.dataset.turnAction;
  }
  updateBattleMessage(phase);
  setCommandLock(battle);
}

function scheduleSync() {
  if (syncFrame) return;
  syncFrame = requestAnimationFrame(() => {
    syncFrame = 0;
    renderPhase();
  });
}

function presentationActionFor(event) {
  if (!event) return null;
  if (event.type === "move_started") return event.actor === "foe" ? "foe" : event.actor === "player" ? "player" : null;
  if (event.type === "battle_item") return "item";
  if (event.type === "trainer_next") return "sendout";
  if (event.type === "capture") return "capture";
  if (event.type === "flee") return "flee";
  if (["turn_end", "exp_gain", "level_up", "move_learned", "move_replaced", "move_declined", "evolution", "item_reward", "money_reward", "battle_result"].includes(event.type)) return "automatic";
  return presentationAction;
}

const battleCard = byId("battle-card");
battleCard?.addEventListener("click", (event) => {
  const battle = battleState();
  if (!battle) return;
  const returnCommand = event.target.closest("#return-board");
  const command = event.target.closest("#moves button[data-move-id],#capture,#flee");
  if (!command && !returnCommand) return;

  const allowed = returnCommand ? returnAllowed(battle) : commandAllowed(battle);
  if (!allowed) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);

if (battleCard && typeof MutationObserver === "function") {
  const observer = new MutationObserver(scheduleSync);
  observer.observe(battleCard, { attributes: true, childList: true, subtree: true });
}

window.addEventListener("safari-battle-presentation-event", (event) => {
  if (!battleState()) return;
  const nextAction = presentationActionFor(event.detail?.event);
  if (nextAction) presentationAction = nextAction;
  renderPhase();
}, { passive: true });
window.addEventListener("safari-runtime-changed", scheduleSync, { passive: true });
window.addEventListener("pageshow", scheduleSync, { passive: true });
scheduleSync();
