import {
  SAFARI_BATTLE_PHASE,
  completeSafariBattlePresentation,
} from "./runtime/safari-battle-orchestrator.js";

const byId = (id) => document.getElementById(id);
let presentationAction = null;
let syncFrame = 0;
let completingPresentation = false;
let resultBattle = null;
let resultFacts = null;

const LOCKED_PHASES = new Set([
  SAFARI_BATTLE_PHASE.ACTION_1,
  SAFARI_BATTLE_PHASE.CHECK_1,
  SAFARI_BATTLE_PHASE.ACTION_2,
  SAFARI_BATTLE_PHASE.CHECK_2,
  SAFARI_BATTLE_PHASE.POST_FAINT,
  SAFARI_BATTLE_PHASE.REPLACEMENT,
  SAFARI_BATTLE_PHASE.POST_VICTORY,
  SAFARI_BATTLE_PHASE.REWARD_GROWTH,
  SAFARI_BATTLE_PHASE.RETURN,
]);

function runtimeState() {
  return globalThis.__maplessSafariRuntime ?? null;
}

function battleState() {
  return runtimeState()?.variables?.mapless?.battle ?? null;
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

function legacyPreviewBusy() {
  return Boolean(byId("save-run")?.disabled);
}

function actionText(action) {
  if (action === "player") return "味方action処理中";
  if (action === "foe") return "相手action処理中";
  if (action === "sendout") return "交代演出中";
  if (action === "item") return "アイテム処理中";
  if (action === "capture") return "捕獲処理中";
  if (action === "flee") return "逃走処理中";
  if (action === "automatic") return "自動効果処理中";
  return "行動処理中";
}

function phasePresentation(phase) {
  if (phase === SAFARI_BATTLE_PHASE.COMMAND) return { key: "command", text: "コマンド選択" };
  if (phase === SAFARI_BATTLE_PHASE.REPLACEMENT) return { key: "replacement", text: "交代選択" };
  if (phase === SAFARI_BATTLE_PHASE.RESULT) return { key: "result", text: "結果" };
  if (phase === SAFARI_BATTLE_PHASE.RETURN) return { key: "return", text: "戻っています…" };
  if (phase === SAFARI_BATTLE_PHASE.POST_FAINT) return { key: "post-faint", text: "ひんし処理中" };
  if (phase === SAFARI_BATTLE_PHASE.POST_VICTORY) return { key: "post-victory", text: "勝敗確定中" };
  if (phase === SAFARI_BATTLE_PHASE.REWARD_GROWTH) return { key: "reward-growth", text: "成長・報酬処理中" };
  return { key: "resolving", text: actionText(presentationAction) };
}

function setOrchestratorLock(element, locked) {
  if (!element) return;
  if (locked) {
    if (element.dataset.orchestratorLocked !== "true") {
      element.dataset.orchestratorWasDisabled = element.disabled ? "true" : "false";
      element.dataset.orchestratorLocked = "true";
    }
    element.inert = true;
    element.disabled = true;
    return;
  }
  if (element.dataset.orchestratorLocked === "true") {
    const wasDisabled = element.dataset.orchestratorWasDisabled === "true";
    element.inert = false;
    element.disabled = wasDisabled;
    delete element.dataset.orchestratorLocked;
    delete element.dataset.orchestratorWasDisabled;
  }
}

function setCommandLock(phase) {
  const commandAllowed = phase === SAFARI_BATTLE_PHASE.COMMAND;
  const returnAllowed = phase === SAFARI_BATTLE_PHASE.RESULT;
  const moves = byId("moves");
  if (moves) moves.inert = !commandAllowed;
  setOrchestratorLock(byId("capture"), !commandAllowed);
  setOrchestratorLock(byId("flee"), !commandAllowed);
  setOrchestratorLock(byId("return-board"), !returnAllowed);
  const panel = byId("battle-card")?.querySelector(".battle-command-panel");
  if (panel) panel.dataset.turnPhaseLocked = commandAllowed ? "false" : "true";
}

function ensureResultFacts(battle) {
  if (resultBattle !== battle) {
    resultBattle = battle;
    resultFacts = {
      exp: 0,
      levels: [],
      moves: [],
      evolutions: [],
      items: [],
      money: 0,
      terminal: null,
    };
  }
  return resultFacts;
}

function trackResultFact(battle, event) {
  if (!battle || !event) return;
  const facts = ensureResultFacts(battle);
  if (event.type === "exp_gain") facts.exp += Math.max(0, Number(event.amount ?? 0));
  else if (event.type === "level_up") facts.levels.push(Number(event.level ?? 0));
  else if (["move_learned", "move_replaced", "move_declined"].includes(event.type)) {
    facts.moves.push({ type: event.type, moveId: event.moveId ?? null, forgottenMoveId: event.forgottenMoveId ?? null });
  } else if (event.type === "evolution") facts.evolutions.push({ from: event.from ?? null, to: event.to ?? null });
  else if (event.type === "item_reward") facts.items.push({ item: event.item ?? "ITEM", quantity: Number(event.quantity ?? 1) });
  else if (event.type === "money_reward") facts.money += Math.max(0, Number(event.amount ?? 0));
  else if (event.type === "battle_result") facts.terminal = { ...event };
}

function resultSummary() {
  const facts = resultFacts;
  if (!facts?.terminal) return null;
  const terminal = facts.terminal;
  const parts = [Number(terminal.decision) === 1 ? "勝利！" : Number(terminal.decision) === 4 ? "捕獲成功！" : "戦闘終了"];
  const exp = Math.max(Number(terminal.expGained ?? 0), Number(facts.exp ?? 0));
  if (exp > 0) parts.push(`${exp} EXP`);
  if (facts.levels.length) parts.push(`Lv.${facts.levels.at(-1)}`);
  for (const move of facts.moves) {
    if (!move.moveId) continue;
    parts.push(move.type === "move_declined" ? `${move.moveId}を見送った` : `${move.moveId}習得`);
  }
  for (const evolution of facts.evolutions) {
    if (evolution.to) parts.push(`${evolution.from ?? "進化"}→${evolution.to}`);
  }
  const terminalItem = terminal.reward?.item
    ? [{ item: terminal.reward.item, quantity: Number(terminal.reward.quantity ?? 1) }]
    : [];
  const items = facts.items.length ? facts.items : terminalItem;
  for (const item of items) parts.push(`${item.item} ×${item.quantity}`);
  const money = Math.max(Number(terminal.moneyGained ?? 0), Number(facts.money ?? 0));
  if (money > 0) parts.push(`${money}円`);
  const destination = terminal.returnTarget === "home" ? "ホーム" : terminal.returnTarget === "village" ? "村" : "Day Board";
  parts.push(`Returnで${destination}へ`);
  return parts.join(" / ");
}

function updateBattleMessage(phase, key) {
  const message = byId("battle-message");
  if (!message) return;
  if (phase === SAFARI_BATTLE_PHASE.RESULT) {
    const summary = resultSummary();
    if (summary) {
      message.dataset.presentationOwner = "orchestrator-result";
      message.textContent = summary;
    }
    return;
  }
  if (LOCKED_PHASES.has(phase) && message.dataset.presentationOwner === "event") return;
  if (!LOCKED_PHASES.has(phase)) delete message.dataset.presentationOwner;
  const text = phase === SAFARI_BATTLE_PHASE.COMMAND
    ? "技を選んでください。"
    : phase === SAFARI_BATTLE_PHASE.REPLACEMENT
      ? "次のポケモンを選んでください。"
      : phase === SAFARI_BATTLE_PHASE.RETURN
        ? "Day Boardへ戻っています…"
        : key === "reward-growth"
          ? "戦闘後の成長・報酬を処理しています…"
          : "ターンを処理しています…";
  if (message.textContent !== text) message.textContent = text;
}

function renderPhase() {
  const battle = battleState();
  const card = byId("battle-card");
  if (!card) return;
  const node = ensurePhaseNode();
  if (!battle) {
    presentationAction = null;
    resultBattle = null;
    resultFacts = null;
    if (node) node.hidden = true;
    delete card.dataset.turnPhase;
    delete card.dataset.turnAction;
    return;
  }
  ensureResultFacts(battle);
  const phase = battle.phase ?? SAFARI_BATTLE_PHASE.COMMAND;
  const view = phasePresentation(phase);
  if (node) {
    node.hidden = false;
    node.textContent = view.text;
    node.dataset.phase = phase;
  }
  card.dataset.turnPhase = phase;
  if (LOCKED_PHASES.has(phase) && presentationAction) card.dataset.turnAction = presentationAction;
  else delete card.dataset.turnAction;
  setCommandLock(phase);
  updateBattleMessage(phase, view.key);
}

function publishRuntimeChanged() {
  if (typeof globalThis.CustomEvent !== "function") return;
  globalThis.window?.dispatchEvent?.(new CustomEvent("safari-runtime-changed"));
}

function completePendingPresentation(reason) {
  const runtime = runtimeState();
  const battle = battleState();
  if (!runtime || !battle?.pending_phase_after_presentation || completingPresentation) return false;
  completingPresentation = true;
  try {
    completeSafariBattlePresentation(runtime, { reason });
    presentationAction = null;
    publishRuntimeChanged();
    return true;
  } finally {
    completingPresentation = false;
  }
}

function settleLegacyPreviewIfReady() {
  const battle = battleState();
  if (!battle?.pending_phase_after_presentation) return;
  if (!legacyPreviewBusy()) completePendingPresentation("legacy preview presentation drained");
}

function syncPhase() {
  syncFrame = 0;
  renderPhase();
}

function scheduleSync() {
  if (syncFrame) return;
  syncFrame = requestAnimationFrame(syncPhase);
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
  const returnCommand = event.target.closest("#return-board");
  const command = event.target.closest("#moves button[data-move-id],#capture,#flee");
  if ((!command && !returnCommand) || !battle) return;
  const phase = battle.phase ?? SAFARI_BATTLE_PHASE.COMMAND;
  const allowed = returnCommand
    ? phase === SAFARI_BATTLE_PHASE.RESULT
    : phase === SAFARI_BATTLE_PHASE.COMMAND;
  if (!allowed) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);

if (battleCard && typeof MutationObserver === "function") {
  const observer = new MutationObserver(scheduleSync);
  observer.observe(battleCard, { attributes: true, childList: true, subtree: true });
}

const saveRun = byId("save-run");
if (saveRun && typeof MutationObserver === "function") {
  const compatibilityObserver = new MutationObserver(() => {
    settleLegacyPreviewIfReady();
    scheduleSync();
  });
  compatibilityObserver.observe(saveRun, { attributes: true, attributeFilter: ["disabled"] });
}

window.addEventListener("safari-battle-presentation-event", (event) => {
  const battle = battleState();
  if (!battle) return;
  const presentationEvent = event.detail?.event;
  trackResultFact(battle, presentationEvent);
  const nextAction = presentationActionFor(presentationEvent);
  if (nextAction) presentationAction = nextAction;
  // game-menu Battle Bag does not toggle preview's global busy flag. Its owner
  // presentation ends at turn_end (or battle_result on a terminal foe response),
  // so use that owner event only as the compatibility completion signal.
  if (!legacyPreviewBusy() && ["turn_end", "battle_result"].includes(presentationEvent?.type)) {
    completePendingPresentation(`owner presentation:${presentationEvent.type}`);
  }
  scheduleSync();
}, { passive: true });
window.addEventListener("safari-runtime-changed", scheduleSync, { passive: true });
window.addEventListener("pageshow", scheduleSync, { passive: true });
scheduleSync();
