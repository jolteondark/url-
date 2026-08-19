import "./runtime/safari-battle-presentation-speed.js?v=20260819-1714";

const COMMAND_PHASE = "COMMAND";
const RESULT_PHASE = "RESULT";
const RETURN_PHASE = "RETURN";

const byId = (id) => document.getElementById(id);

function state() {
  return globalThis.__maplessSafariRuntime?.variables?.mapless ?? null;
}

function battle() {
  return state()?.battle ?? null;
}

function phaseOf(currentBattle = battle()) {
  if (!currentBattle) return null;
  if (currentBattle.phase) return currentBattle.phase;
  return currentBattle.completed ? RESULT_PHASE : COMMAND_PHASE;
}

function phaseLabel(phase, turn) {
  if (phase === COMMAND_PHASE) return `Turn ${turn}`;
  if (phase === RESULT_PHASE) return "Result";
  if (phase === RETURN_PHASE) return "Return";
  if (phase === "REPLACEMENT") return "Replacement";
  if (phase === "REWARD_GROWTH") return "Rewards";
  if (phase === "POST_VICTORY") return "Victory";
  if (phase === "POST_FAINT") return "Faint";
  return "Resolving";
}

function phaseMessage(currentBattle, phase) {
  const notice = state()?.notice;
  if (phase === COMMAND_PHASE) return "技を選んでください。";
  if (phase === "REPLACEMENT") return notice || "次のポケモンを選んでください。";
  if (phase === "POST_FAINT") return notice || "ひんし処理中…";
  if (phase === "POST_VICTORY") return notice || "勝利処理中…";
  if (phase === "REWARD_GROWTH") return notice || "経験値・報酬を処理しています…";
  if (phase === RESULT_PHASE) return notice || (Number(currentBattle?.decision) === 1 ? "勝利しました。" : "戦闘終了。");
  if (phase === RETURN_PHASE) return "戻っています…";
  return "行動を処理しています…";
}

export function applySafariBattlePhaseUi() {
  const currentBattle = battle();
  if (!currentBattle) return;

  const phase = phaseOf(currentBattle);
  const commandAllowed = phase === COMMAND_PHASE && !currentBattle.completed;
  const resultReady = phase === RESULT_PHASE || Boolean(currentBattle.completed);

  const turn = byId("turn");
  if (turn) turn.textContent = phaseLabel(phase, Number(currentBattle.turn ?? 1));

  const message = byId("battle-message");
  if (message && message.dataset.presentationOwner !== "event") {
    message.textContent = phaseMessage(currentBattle, phase);
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
    capture.inert = !commandAllowed;
    capture.disabled = !commandAllowed;
  }

  const flee = byId("flee");
  if (flee) {
    const canFlee = currentBattle.kind === "wild" && currentBattle.origin !== "village_bounty" && !resultReady;
    flee.hidden = resultReady;
    flee.inert = !commandAllowed || !canFlee;
    flee.disabled = !commandAllowed || !canFlee;
    flee.textContent = canFlee ? "にげる" : "にげられない";
  }

  const returnButton = byId("return-board");
  if (returnButton) {
    returnButton.hidden = !resultReady;
    returnButton.inert = phase !== RESULT_PHASE;
    returnButton.disabled = phase !== RESULT_PHASE;
  }

  const card = byId("battle-card");
  if (card) {
    card.dataset.battlePhase = phase ?? "";
    card.setAttribute("aria-busy", String(!commandAllowed && phase !== RESULT_PHASE));
    const panel = card.querySelector(".battle-command-panel");
    if (panel) panel.dataset.turnPhaseLocked = commandAllowed ? "false" : "true";
  }
}

let pending = false;
function scheduleApply() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => {
    pending = false;
    applySafariBattlePhaseUi();
  });
}

window.addEventListener("safari-runtime-changed", scheduleApply);
window.addEventListener("pageshow", scheduleApply);
window.addEventListener("safari-preview-start", scheduleApply);

const observer = new MutationObserver((mutations) => {
  if (!battle()) return;
  if (mutations.some((mutation) => mutation.target?.closest?.("#battle-card") || mutation.target?.id === "battle-card")) scheduleApply();
});

observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ["hidden", "disabled", "inert"] });
scheduleApply();

globalThis.__maplessApplyBattlePhaseUi = applySafariBattlePhaseUi;
