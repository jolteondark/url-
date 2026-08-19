import {
  ensureSafariGeneralCombatData,
  ensureSafariGeneralData,
  safariGeneralCombatReady,
  safariGeneralDataReady,
} from "./runtime/safari-general-data-demand.js";

const byId = (id) => document.getElementById(id);
let lastActivatedIndex = null;
let prewarmPromise = null;
let focusQueued = false;

function state() {
  return globalThis.__maplessSafariRuntime?.variables?.mapless ?? null;
}

function eventAt(index) {
  return state()?.board_events?.[index] ?? null;
}

function visibleEnabled(selector, root = document) {
  return [...root.querySelectorAll(selector)]
    .find((node) => !node.hidden && !node.disabled && node.getClientRects().length > 0) ?? null;
}

function actionableBoardButton(preferAfter = null) {
  const board = byId("board");
  if (!board) return null;
  const buttons = [...board.querySelectorAll("button[data-board-index]")]
    .filter((button) => !button.disabled && !button.classList.contains("consumed") && button.getClientRects().length > 0);
  if (!buttons.length) return visibleEnabled("#enter-village:not(:disabled)", byId("board-card") ?? document);
  if (Number.isInteger(preferAfter)) {
    const later = buttons.find((button) => Number(button.dataset.boardIndex) > preferAfter);
    if (later) return later;
  }
  return buttons[0];
}

function focusNextBoardAction() {
  if (focusQueued) return;
  focusQueued = true;
  requestAnimationFrame(() => {
    focusQueued = false;
    const current = state();
    const boardCard = byId("board-card");
    if (!current || current.location !== "day_board" || current.battle || current.shop || !boardCard || boardCard.hidden) return;
    const target = actionableBoardButton(lastActivatedIndex);
    if (target instanceof HTMLElement) {
      target.focus({ preventScroll:true });
      target.scrollIntoView?.({ behavior:"smooth", block:"nearest", inline:"nearest" });
    }
  });
}

function prewarmForIndex(index) {
  const event = eventAt(index);
  if (!event) return;
  if (event.kind === "wild" || event.kind === "trainer") {
    if (safariGeneralCombatReady() || prewarmPromise) return;
    prewarmPromise = ensureSafariGeneralCombatData()
      .catch((error) => {
        globalThis.__maplessLastError = error;
      })
      .finally(() => { prewarmPromise = null; });
    return;
  }
  if (event.kind === "normal_event" && event.normal_event_id === "wounded_pokemon") {
    if (safariGeneralDataReady() || prewarmPromise) return;
    prewarmPromise = ensureSafariGeneralData()
      .catch((error) => {
        globalThis.__maplessLastError = error;
      })
      .finally(() => { prewarmPromise = null; });
  }
}

function boardIndexFromTarget(target) {
  const button = target?.closest?.("button[data-board-index]");
  return button ? Number(button.dataset.boardIndex) : null;
}

for (const eventName of ["pointerdown", "touchstart", "focusin"]) {
  byId("board")?.addEventListener(eventName, (event) => {
    const index = boardIndexFromTarget(event.target);
    if (!Number.isInteger(index)) return;
    prewarmForIndex(index);
  }, { passive:true });
}

byId("board")?.addEventListener("click", (event) => {
  const index = boardIndexFromTarget(event.target);
  if (!Number.isInteger(index)) return;
  lastActivatedIndex = index;
  const board = byId("board");
  if (board) board.dataset.flowBusy = "true";
  const button = event.target.closest("button[data-board-index]");
  if (button) button.setAttribute("aria-current", "step");
}, true);

function sync() {
  const current = state();
  const board = byId("board");
  if (!current || !board) return;

  if (current.battle || current.shop || current.location !== "day_board") {
    delete board.dataset.flowBusy;
    return;
  }

  delete board.dataset.flowBusy;
  for (const button of board.querySelectorAll('[aria-current="step"]')) button.removeAttribute("aria-current");
  focusNextBoardAction();
}

window.addEventListener("safari-runtime-changed", sync, { passive:true });
window.addEventListener("pageshow", sync, { passive:true });
if (typeof MutationObserver === "function") {
  new MutationObserver(sync).observe(document.documentElement, {
    subtree:true,
    childList:true,
    attributes:true,
    attributeFilter:["hidden","disabled","class"],
  });
}
requestAnimationFrame(sync);
