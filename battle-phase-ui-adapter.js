import "./runtime/safari-battle-presentation-speed.js?v=20260819-1714";

const COMMAND_PHASE = "COMMAND";
const RESULT_PHASE = "RESULT";
const RETURN_PHASE = "RETURN";
const REPLACEMENT_PHASE = "REPLACEMENT";
const VALID_PHASES = new Set([
  COMMAND_PHASE,
  "ACTION_1",
  "CHECK_1",
  "ACTION_2",
  "CHECK_2",
  "POST_FAINT",
  REPLACEMENT_PHASE,
  "POST_VICTORY",
  "REWARD_GROWTH",
  RESULT_PHASE,
  RETURN_PHASE,
]);
const RETURN_MUTATION_MENU_IDS = ["menu-party", "menu-bag", "menu-box"];

const byId = (id) => document.getElementById(id);

function state() {
  return globalThis.__maplessSafariRuntime?.variables?.mapless ?? null;
}

function battle() {
  return state()?.battle ?? null;
}

function pendingBattleReturnCommit() {
  return state()?.pending_battle_return_checkpoint?.committed === false;
}

function phaseOf(currentBattle = battle()) {
  const phase = currentBattle?.phase;
  return VALID_PHASES.has(phase) ? phase : null;
}

function phaseLabel(currentBattle, phase, turn) {
  if (phase === COMMAND_PHASE) return `Turn ${turn}`;
  if (phase === RESULT_PHASE) return "Result";
  if (phase === RETURN_PHASE) return "Return";
  if (phase === REPLACEMENT_PHASE) return "Replacement";
  if (phase === "REWARD_GROWTH") return "Rewards";
  if (phase === "POST_VICTORY") return Number(currentBattle?.decision) === 1 ? "Victory" : "Battle End";
  if (phase === "POST_FAINT") return "Faint";
  if (phase === "ACTION_1") return "Action 1";
  if (phase === "CHECK_1") return "Check 1";
  if (phase === "ACTION_2") return "Action 2";
  if (phase === "CHECK_2") return "Check 2";
  return "Resolving";
}

function phaseMessage(currentBattle, phase) {
  const notice = state()?.notice;
  if (phase === COMMAND_PHASE) return "技を選んでください。";
  if (phase === REPLACEMENT_PHASE) return notice || "次のポケモンを選んでください。";
  if (phase === "POST_FAINT") return notice || "ひんし処理中…";
  if (phase === "POST_VICTORY") return notice || (Number(currentBattle?.decision) === 1 ? "勝利処理中…" : "戦闘終了処理中…");
  if (phase === "REWARD_GROWTH") return notice || "経験値・報酬を処理しています…";
  if (phase === RESULT_PHASE) return notice || (Number(currentBattle?.decision) === 1 ? "勝利しました。" : "戦闘終了。");
  if (phase === RETURN_PHASE) return "戻っています…";
  return phase ? "行動を処理しています…" : "戦闘状態を同期しています…";
}

function movePp(button) {
  const text = button.querySelector("small")?.textContent ?? "";
  const match = text.match(/PP\s+(\d+)/);
  return match ? Number(match[1]) : 1;
}

function setInteractive(element, enabled) {
  if (!element) return;
  element.inert = !enabled;
  element.disabled = !enabled;
}

function setOwnerAwarePhaseInteractive(element, enabled) {
  if (!element) return;
  const phaseLocked = element.dataset.battlePhaseLocked === "true";
  if (!enabled) {
    if (!phaseLocked) {
      element.dataset.battlePhaseLocked = "true";
      element.dataset.battleOwnerDisabled = String(Boolean(element.disabled));
    }
    element.inert = true;
    element.disabled = true;
    return;
  }

  element.inert = false;
  if (!phaseLocked) return;
  element.disabled = element.dataset.battleOwnerDisabled === "true";
  delete element.dataset.battlePhaseLocked;
  delete element.dataset.battleOwnerDisabled;
}

function releaseOwnerAwarePhaseLock(element) {
  if (!element) return;
  element.inert = false;
  if (element.dataset.battlePhaseLocked !== "true") return;
  delete element.dataset.battlePhaseLocked;
  delete element.dataset.battleOwnerDisabled;
}

function releaseBattleCommandLocks() {
  for (const button of document.querySelectorAll?.("button[data-bag-use-item],button[data-player-replacement-party-index]") ?? []) {
    releaseOwnerAwarePhaseLock(button);
  }
}

function releaseBattlePersistenceLocks() {
  for (const id of ["new-run", "save-run", "continue-run"]) {
    releaseOwnerAwarePhaseLock(byId(id));
  }
}

function setPendingReturnMenuLocked(locked) {
  for (const id of RETURN_MUTATION_MENU_IDS) {
    setInteractive(byId(id), !locked);
  }
}

export function applySafariBattlePhaseUi() {
  const currentBattle = battle();
  if (!currentBattle) {
    releaseBattleCommandLocks();
    const returnCommitPending = pendingBattleReturnCommit();
    setPendingReturnMenuLocked(returnCommitPending);
    if (returnCommitPending) {
      for (const id of ["new-run", "save-run", "continue-run"]) {
        setOwnerAwarePhaseInteractive(byId(id), false);
      }
    } else {
      releaseBattlePersistenceLocks();
    }
    return;
  }

  const phase = phaseOf(currentBattle);
  const commandAllowed = phase === COMMAND_PHASE;
  const replacementAllowed = phase === REPLACEMENT_PHASE;
  const resultReady = phase === RESULT_PHASE;
  const persistenceAllowed = commandAllowed || resultReady;

  const turn = byId("turn");
  if (turn) turn.textContent = phaseLabel(currentBattle, phase, Number(currentBattle.turn ?? 1));

  const message = byId("battle-message");
  if (message && message.dataset.presentationOwner !== "event") {
    message.textContent = phaseMessage(currentBattle, phase);
  }

  const moves = byId("moves");
  if (moves) {
    moves.inert = !commandAllowed;
    for (const button of moves.querySelectorAll("button[data-move-id]")) {
      button.disabled = !commandAllowed || movePp(button) <= 0;
    }
  }

  const capture = byId("capture");
  if (capture) {
    const available = commandAllowed && currentBattle.kind === "wild";
    capture.hidden = currentBattle.kind !== "wild" || resultReady;
    setInteractive(capture, available);
  }

  const flee = byId("flee");
  if (flee) {
    const canFlee = currentBattle.kind === "wild" && currentBattle.origin !== "village_bounty";
    flee.hidden = resultReady;
    setInteractive(flee, commandAllowed && canFlee);
    flee.textContent = canFlee ? "にげる" : "にげられない";
  }

  const returnButton = byId("return-board");
  if (returnButton) {
    returnButton.hidden = !resultReady;
    setInteractive(returnButton, resultReady);
  }

  setOwnerAwarePhaseInteractive(byId("new-run"), false);
  for (const id of ["save-run", "continue-run"]) {
    setOwnerAwarePhaseInteractive(byId(id), persistenceAllowed);
  }
  for (const button of document.querySelectorAll?.("button[data-bag-use-item]") ?? []) {
    setOwnerAwarePhaseInteractive(button, commandAllowed);
  }
  for (const button of document.querySelectorAll?.("button[data-player-replacement-party-index]") ?? []) {
    setOwnerAwarePhaseInteractive(button, replacementAllowed);
  }

  const card = byId("battle-card");
  if (card) {
    card.dataset.battlePhase = phase ?? "UNSYNCED";
    card.dataset.turnPhaseLocked = commandAllowed || replacementAllowed || resultReady ? "false" : "true";
    card.setAttribute("aria-busy", String(!commandAllowed && !replacementAllowed && !resultReady));
  }
}

function shouldAllowBattleClick(target, currentBattle = battle()) {
  if (!target?.closest) return true;
  if (pendingBattleReturnCommit() && target.closest("#new-run,#save-run,#continue-run,#menu-party,#menu-bag,#menu-box")) return false;
  if (!currentBattle) return true;
  const phase = phaseOf(currentBattle);
  if (target.closest("#new-run")) return false;
  if (target.closest("#return-board")) return phase === RESULT_PHASE;
  if (target.closest("#save-run,#continue-run")) return phase === COMMAND_PHASE || phase === RESULT_PHASE;
  if (target.closest("button[data-player-replacement-party-index]")) return phase === REPLACEMENT_PHASE;
  if (target.closest("#moves button[data-move-id],#capture,#flee,button[data-bag-use-item]")) return phase === COMMAND_PHASE;
  return true;
}

document.addEventListener("click", (event) => {
  if (shouldAllowBattleClick(event.target)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);

let pending = false;
function scheduleApply() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => {
    pending = false;
    applySafariBattlePhaseUi();
  });
}

window.addEventListener("safari-runtime-changed", scheduleApply, { passive: true });
window.addEventListener("safari-preview-start", scheduleApply, { passive: true });
window.addEventListener("safari-battle-presentation-event", scheduleApply, { passive: true });
window.addEventListener("safari-game-menu-opened", scheduleApply, { passive: true });
window.addEventListener("pageshow", scheduleApply, { passive: true });
scheduleApply();

globalThis.__maplessApplyBattlePhaseUi = applySafariBattlePhaseUi;