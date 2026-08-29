const POLL_INTERVAL_MS = 25;
const MAX_POLLS = 100;
const EVENT_ID_BY_KIND = Object.freeze({
  treasure: "treasure_chest",
  miner: "miner",
  tavern: "tavern",
});

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  return state && typeof state === "object" && !Array.isArray(state) ? state : null;
}

function boardButtonIndex(event) {
  const button = event.target?.closest?.("button[data-board-index]");
  if (!button) return null;
  const index = Number(button.dataset.boardIndex);
  return Number.isInteger(index) ? index : null;
}

function activeUiMatches(runtime, index, eventId, beforeUi) {
  const ui = globalThis.__maplessNormalEventUi;
  return Boolean(ui
    && ui !== beforeUi
    && ui.runtime === runtime
    && Number(ui.boardIndex) === index
    && ui.eventId === eventId);
}

async function publishWhenOpened(runtime, index, eventId, beforeUi) {
  for (let attempt = 0; attempt < MAX_POLLS; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    if (!activeUiMatches(runtime, index, eventId, beforeUi)) continue;
    if (typeof globalThis.CustomEvent === "function") {
      globalThis.window?.dispatchEvent?.(new globalThis.CustomEvent("safari-normal-event-ui"));
    }
    globalThis.__maplessLastSpecialEventUiHandoff = { index, eventId, attempt };
    return true;
  }
  return false;
}

function handleBoardClick(event) {
  const index = boardButtonIndex(event);
  if (index == null) return;
  const runtime = globalThis.__maplessSafariRuntime;
  const state = stateOf(runtime);
  const kind = state?.board_events?.[index]?.kind;
  const eventId = EVENT_ID_BY_KIND[kind];
  if (!eventId) return;
  void publishWhenOpened(runtime, index, eventId, globalThis.__maplessNormalEventUi);
}

const board = globalThis.document?.getElementById?.("board");
board?.addEventListener("click", handleBoardClick);

export { activeUiMatches, boardButtonIndex, publishWhenOpened };
