const byId = (id) => document.getElementById(id);

let pendingIndex = null;
let pendingEvent = null;
let pendingConsumedBefore = false;
let hideTimer = null;

function state() {
  return globalThis.__maplessSafariRuntime?.variables?.mapless ?? null;
}

function boardButton(index) {
  return byId("board")?.querySelector(`button[data-board-index="${index}"]`) ?? null;
}

function eventLabel(event) {
  if (!event) return "イベント";
  if (event.kind === "normal_event") return "イベント結果";
  if (event.kind === "treasure" || event.kind === "chest") return "宝箱";
  if (event.kind === "reward") return "報酬";
  return "イベント結果";
}

function ensureResultStrip() {
  const card = byId("board-card");
  const notice = byId("notice");
  if (!card || !notice) return null;
  let strip = byId("board-event-result-strip");
  if (!strip) {
    strip = document.createElement("aside");
    strip.id = "board-event-result-strip";
    strip.className = "board-event-result-strip";
    strip.setAttribute("role", "status");
    strip.setAttribute("aria-live", "polite");
    strip.innerHTML = '<small></small><strong></strong>';
    notice.after(strip);
  }
  return strip;
}

function hideResultStrip() {
  const strip = byId("board-event-result-strip");
  if (strip) strip.hidden = true;
}

function nextBoardAction(afterIndex) {
  const board = byId("board");
  if (!board) return null;
  const actions = [...board.querySelectorAll("button[data-board-index]")]
    .filter((button) => !button.disabled && !button.classList.contains("consumed") && button.getClientRects().length > 0);
  return actions.find((button) => Number(button.dataset.boardIndex) > afterIndex)
    ?? actions[0]
    ?? (byId("enter-village")?.disabled ? null : byId("enter-village"));
}

function presentSettledEvent(index, event) {
  const current = state();
  if (!current || current.location !== "day_board" || current.battle || current.shop) return;

  const strip = ensureResultStrip();
  if (!strip) return;
  const message = String(current.notice ?? "").trim();
  if (!message) return;

  strip.querySelector("small").textContent = eventLabel(event);
  strip.querySelector("strong").textContent = message;
  strip.hidden = false;
  strip.dataset.boardIndex = String(index);
  strip.scrollIntoView?.({ behavior:"smooth", block:"nearest" });

  window.clearTimeout(hideTimer);
  hideTimer = window.setTimeout(() => {
    hideResultStrip();
    const target = nextBoardAction(index);
    if (target instanceof HTMLElement) {
      target.focus({ preventScroll:true });
      target.scrollIntoView?.({ behavior:"smooth", block:"nearest", inline:"nearest" });
    }
  }, 1150);
}

function boardIndexFromTarget(target) {
  const button = target?.closest?.("button[data-board-index]");
  return button ? Number(button.dataset.boardIndex) : null;
}

byId("board")?.addEventListener("click", (event) => {
  const index = boardIndexFromTarget(event.target);
  if (!Number.isInteger(index)) return;
  hideResultStrip();
  const current = state();
  pendingIndex = index;
  pendingEvent = current?.board_events?.[index] ?? null;
  pendingConsumedBefore = Boolean(current?.board_consumed?.[index]);
}, true);

function sync() {
  if (!Number.isInteger(pendingIndex)) return;
  const current = state();
  if (!current) return;
  if (current.battle || current.shop || current.location !== "day_board") return;

  const button = boardButton(pendingIndex);
  const consumedNow = Boolean(current.board_consumed?.[pendingIndex]) || Boolean(button?.classList.contains("consumed"));
  if (pendingConsumedBefore || !consumedNow) return;

  const index = pendingIndex;
  const event = pendingEvent;
  pendingIndex = null;
  pendingEvent = null;
  pendingConsumedBefore = false;
  requestAnimationFrame(() => presentSettledEvent(index, event));
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
