const POLL_INTERVAL_MS = 25;
const MAX_POLLS = 100;

function boardButtonIndex(event) {
  const button = event.target?.closest?.("button[data-board-index]");
  if (!button) return null;
  const index = Number(button.dataset.boardIndex);
  return Number.isInteger(index) ? index : null;
}

function activeUiMatches(runtime, index, beforeUi) {
  const ui = globalThis.__maplessNormalEventUi;
  return Boolean(ui
    && ui !== beforeUi
    && ui.runtime === runtime
    && Number(ui.boardIndex) === index);
}

async function publishWhenOpened(runtime, index, beforeUi) {
  for (let attempt = 0; attempt < MAX_POLLS; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    if (!activeUiMatches(runtime, index, beforeUi)) continue;
    if (typeof globalThis.CustomEvent === "function") {
      globalThis.window?.dispatchEvent?.(new globalThis.CustomEvent("safari-normal-event-ui"));
    }
    globalThis.__maplessLastSpecialEventUiHandoff = {
      index,
      eventId: globalThis.__maplessNormalEventUi?.eventId ?? null,
      attempt,
    };
    return true;
  }
  return false;
}

function handleBoardClick(event) {
  const index = boardButtonIndex(event);
  if (index == null) return;
  const runtime = globalThis.__maplessSafariRuntime;
  void publishWhenOpened(runtime, index, globalThis.__maplessNormalEventUi);
}

const board = globalThis.document?.getElementById?.("board");
board?.addEventListener("click", handleBoardClick);

export { activeUiMatches, boardButtonIndex, publishWhenOpened };
