import { SAFARI_BATTLE_PHASE, completeSafariBattlePresentation } from "./runtime/safari-battle-orchestrator.js";

const byId = (id) => document.getElementById(id);
let pending = false;
let resultBattle = null;
let resultFacts = null;
let completingPresentation = false;

function runtime() {
  return globalThis.__maplessSafariRuntime ?? null;
}

function battle() {
  return runtime()?.variables?.mapless?.battle ?? null;
}

function phaseLabel(phase, turn) {
  if (phase === SAFARI_BATTLE_PHASE.COMMAND) return `Turn ${turn}`;
  if (phase === SAFARI_BATTLE_PHASE.RESULT) return "Result";
  if (phase === SAFARI_BATTLE_PHASE.RETURN) return "Return";
  if (phase === SAFARI_BATTLE_PHASE.REPLACEMENT) return "Replacement";
  if (phase === SAFARI_BATTLE_PHASE.REWARD_GROWTH) return "Rewards";
  if (phase === SAFARI_BATTLE_PHASE.POST_VICTORY) return "Victory";
  if (phase === SAFARI_BATTLE_PHASE.POST_FAINT) return "Faint";
  return "Resolving";
}

function ensureResultFacts(currentBattle) {
  if (resultBattle !== currentBattle) {
    resultBattle = currentBattle;
    resultFacts = { exp: 0, levels: [], moves: [], evolutions: [], items: [], money: 0, terminal: null };
  }
  return resultFacts;
}

function trackResultFact(currentBattle, event) {
  if (!currentBattle || !event) return;
  const facts = ensureResultFacts(currentBattle);
  if (event.type === "exp_gain") facts.exp += Math.max(0, Number(event.amount ?? 0));
  else if (event.type === "level_up") facts.levels.push(Number(event.level ?? 0));
  else if (["move_learned", "move_replaced", "move_declined"].includes(event.type)) facts.moves.push({ type: event.type, moveId: event.moveId ?? null });
  else if (event.type === "evolution") facts.evolutions.push({ from: event.from ?? null, to: event.to ?? null });
  else if (event.type === "item_reward") facts.items.push({ item: event.item ?? "ITEM", quantity: Number(event.quantity ?? 1) });
  else if (event.type === "money_reward") facts.money += Math.max(0, Number(event.amount ?? 0));
  else if (event.type === "battle_result") facts.terminal = { ...event };
}

function resultMessage(currentBattle) {
  const facts = ensureResultFacts(currentBattle);
  const terminal = facts.terminal;
  if (!terminal) return null;
  const decision = Number(terminal.decision ?? currentBattle.decision ?? 0);
  const parts = [decision === 1 ? "勝利！" : decision === 4 ? "捕獲成功！" : "敗北…"];
  const exp = Math.max(Number(terminal.expGained ?? 0), Number(facts.exp ?? 0));
  if (exp > 0) parts.push(`${exp} EXP`);
  if (facts.levels.length) parts.push(`Lv.${facts.levels.at(-1)}`);
  for (const move of facts.moves) if (move.moveId) parts.push(move.type === "move_declined" ? `${move.moveId}を見送った` : `${move.moveId}習得`);
  for (const evolution of facts.evolutions) if (evolution.to) parts.push(`${evolution.from ?? "進化"}→${evolution.to}`);
  const items = facts.items.length ? facts.items : terminal.reward?.item ? [{ item: terminal.reward.item, quantity: Number(terminal.reward.quantity ?? 1) }] : [];
  for (const item of items) parts.push(`${item.item} ×${item.quantity}`);
  const money = Math.max(Number(terminal.moneyGained ?? 0), Number(facts.money ?? 0));
  if (money > 0) parts.push(`${money}円`);
  const destination = terminal.returnTarget === "home" ? "ホーム" : terminal.returnTarget === "village" ? "村" : "Day Board";
  parts.push(`Returnで${destination}へ`);
  return parts.join(" / ");
}

function phaseMessage(currentBattle, phase) {
  if (phase === SAFARI_BATTLE_PHASE.COMMAND) return "技を選んでください。";
  if (phase === SAFARI_BATTLE_PHASE.REPLACEMENT) return "次のポケモンを選んでください。";
  if (phase === SAFARI_BATTLE_PHASE.POST_FAINT) return "ひんし処理中…";
  if (phase === SAFARI_BATTLE_PHASE.POST_VICTORY) return "勝敗確定中…";
  if (phase === SAFARI_BATTLE_PHASE.REWARD_GROWTH) return "経験値・成長・報酬を処理しています…";
  if (phase === SAFARI_BATTLE_PHASE.RESULT) return resultMessage(currentBattle) ?? "戦闘結果";
  if (phase === SAFARI_BATTLE_PHASE.RETURN) return "戻っています…";
  return "行動を処理しています…";
}

function setManagedDisabled(element, disabled) {
  if (!element) return;
  element.inert = disabled;
  element.disabled = disabled;
}

export function applySafariBattlePhaseUi() {
  const currentBattle = battle();
  if (!currentBattle) {
    resultBattle = null;
    resultFacts = null;
    return;
  }

  const phase = currentBattle.phase ?? SAFARI_BATTLE_PHASE.COMMAND;
  const commandAllowed = phase === SAFARI_BATTLE_PHASE.COMMAND;
  const resultReady = phase === SAFARI_BATTLE_PHASE.RESULT;

  const turn = byId("turn");
  if (turn) turn.textContent = phaseLabel(phase, Number(currentBattle.turn ?? 1));

  const message = byId("battle-message");
  if (message && (phase === SAFARI_BATTLE_PHASE.RESULT || message.dataset.presentationOwner !== "event")) {
    message.textContent = phaseMessage(currentBattle, phase);
    if (phase === SAFARI_BATTLE_PHASE.RESULT) message.dataset.presentationOwner = "orchestrator-result";
  }

  const moves = byId("moves");
  if (moves) {
    moves.inert = !commandAllowed;
    for (const button of moves.querySelectorAll("button[data-move-id]")) {
      const ppText = button.querySelector("small")?.textContent ?? "";
      const ppMatch = ppText.match(/PP\s+(\d+)/);
      const noPp = ppMatch ? Number(ppMatch[1]) <= 0 : false;
      button.disabled = !commandAllowed || noPp;
    }
  }

  const capture = byId("capture");
  if (capture) {
    capture.hidden = currentBattle.kind !== "wild" || resultReady;
    setManagedDisabled(capture, !commandAllowed || currentBattle.kind !== "wild");
  }

  const flee = byId("flee");
  if (flee) {
    const canFlee = currentBattle.kind === "wild" && currentBattle.origin !== "village_bounty";
    flee.hidden = resultReady;
    setManagedDisabled(flee, !commandAllowed || !canFlee);
    flee.textContent = canFlee ? "にげる" : "にげられない";
  }

  const returnButton = byId("return-board");
  if (returnButton) {
    returnButton.hidden = !resultReady;
    setManagedDisabled(returnButton, !resultReady);
  }

  const card = byId("battle-card");
  if (card) {
    card.dataset.battlePhase = phase;
    card.setAttribute("aria-busy", String(phase !== SAFARI_BATTLE_PHASE.COMMAND && phase !== SAFARI_BATTLE_PHASE.RESULT));
  }
}

function scheduleApply() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => {
    pending = false;
    applySafariBattlePhaseUi();
  });
}

function legacyPreviewBusy() {
  return Boolean(byId("save-run")?.disabled);
}

function settlePendingPresentation(reason) {
  const currentRuntime = runtime();
  const currentBattle = battle();
  if (!currentRuntime || !currentBattle?.pending_phase_after_presentation || completingPresentation) return;
  completingPresentation = true;
  try {
    completeSafariBattlePresentation(currentRuntime, { reason });
    window.dispatchEvent(new CustomEvent("safari-runtime-changed"));
  } finally {
    completingPresentation = false;
  }
}

byId("battle-card")?.addEventListener("click", (event) => {
  const currentBattle = battle();
  if (!currentBattle) return;
  const isReturn = Boolean(event.target.closest("#return-board"));
  const isCommand = Boolean(event.target.closest("#moves button[data-move-id],#capture,#flee"));
  if (!isReturn && !isCommand) return;
  const allowed = isReturn
    ? currentBattle.phase === SAFARI_BATTLE_PHASE.RESULT
    : currentBattle.phase === SAFARI_BATTLE_PHASE.COMMAND;
  if (!allowed) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);

window.addEventListener("safari-battle-presentation-event", (event) => {
  const currentBattle = battle();
  if (!currentBattle) return;
  const presentationEvent = event.detail?.event;
  trackResultFact(currentBattle, presentationEvent);
  if (!legacyPreviewBusy() && ["turn_end", "battle_result"].includes(presentationEvent?.type)) {
    settlePendingPresentation(`owner presentation:${presentationEvent.type}`);
  }
  scheduleApply();
}, { passive: true });
window.addEventListener("safari-runtime-changed", scheduleApply, { passive: true });
window.addEventListener("pageshow", scheduleApply, { passive: true });
window.addEventListener("safari-preview-start", scheduleApply, { passive: true });

const saveRun = byId("save-run");
if (saveRun && typeof MutationObserver === "function") {
  new MutationObserver(() => {
    const currentBattle = battle();
    if (currentBattle?.pending_phase_after_presentation && !legacyPreviewBusy()) settlePendingPresentation("legacy preview presentation drained");
    scheduleApply();
  }).observe(saveRun, { attributes: true, attributeFilter: ["disabled"] });
}

const card = byId("battle-card");
if (card && typeof MutationObserver === "function") {
  new MutationObserver(scheduleApply).observe(card, { subtree: true, childList: true });
}

scheduleApply();
globalThis.__maplessApplyBattlePhaseUi = applySafariBattlePhaseUi;
