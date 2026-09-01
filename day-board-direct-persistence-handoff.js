import {
  ownerResultRequestsPersistence,
  persistSafariOwnerResult,
  requestsPersistence,
} from "./runtime/safari-owner-result-persistence.js";

const POLL_INTERVAL_MS = 25;
const MAX_POLLS = 80;

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

async function persistWhenOwnerRequests(index, beforeOperations) {
  for (let attempt = 0; attempt < MAX_POLLS; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    const runtime = globalThis.__maplessSafariRuntime;
    const state = stateOf(runtime);
    if (!state) return;
    const operations = state.last_operations;
    if (operations === beforeOperations || !requestsPersistence(operations)) continue;

    const saved = persistSafariOwnerResult(runtime, { operations });
    globalThis.__maplessLastBoardPersistence = {
      index,
      key: saved?.key ?? null,
      attempt,
    };
    return;
  }
}

function handleBoardClick(event) {
  const index = boardButtonIndex(event);
  if (index == null) return;
  const runtime = globalThis.__maplessSafariRuntime;
  const state = stateOf(runtime);
  if (!state?.board_events?.[index]) return;
  void persistWhenOwnerRequests(index, state.last_operations);
}

const board = globalThis.document?.getElementById?.("board");
board?.addEventListener("click", handleBoardClick);

export {
  boardButtonIndex,
  ownerResultRequestsPersistence,
  persistSafariOwnerResult,
  requestsPersistence,
};
