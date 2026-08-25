import {
  resolveSafariItemCollectorInteraction,
  safariItemCollectorPresentation,
} from "./runtime/safari-item-collector-interaction.js?v=20260825-2355";
import { saveSafariPlayableRun } from "./runtime/safari-web-startup.js";

let resolving = false;
function runtime() { return globalThis.__maplessSafariRuntime ?? null; }
function state() { return runtime()?.variables?.mapless ?? null; }
function collectorAt(index) {
  const event = state()?.board_events?.[index];
  return event?.kind === "normal_event" && event?.normal_event_id === "item_collector" ? event : null;
}
function activeCollectorUi() {
  const active = globalThis.__maplessNormalEventUi ?? null;
  return active?.runtime === runtime() && active?.eventId === "item_collector" ? active : null;
}
function publish(name) {
  if (typeof globalThis.CustomEvent !== "function") return;
  globalThis.window?.dispatchEvent?.(new CustomEvent(name));
}
function setUi(index, category = null) {
  const current = runtime();
  const currentState = state();
  if (!current || !currentState || !collectorAt(index)) return false;
  const presentation = safariItemCollectorPresentation(current, index, category);
  currentState.notice = presentation.message;
  globalThis.__maplessNormalEventUi = {
    runtime:current,
    boardIndex:index,
    eventId:"item_collector",
    category,
    title:presentation.title,
    message:presentation.message,
    actions:presentation.actions,
  };
  publish("safari-normal-event-ui");
  publish("safari-runtime-changed");
  return true;
}
function openCollector(index) {
  const currentState = state();
  if (!currentState || !collectorAt(index)) return false;
  if (currentState.location !== "day_board" || currentState.battle || currentState.shop || currentState.board_consumed?.[index]) return false;
  currentState.board_revealed[index] = true;
  currentState.board_visited[index] = true;
  return setUi(index, null);
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-board-index]");
  if (!button || button.disabled) return;
  const index = Number(button.dataset.boardIndex);
  if (!Number.isInteger(index) || !collectorAt(index)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  try {
    openCollector(index);
  } catch (error) {
    globalThis.__maplessLastError = error;
    const currentState = state();
    if (currentState) currentState.notice = `イベントエラー: ${error?.message ?? error}`;
    publish("safari-runtime-changed");
  }
}, { capture:true });

document.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-normal-event-action]");
  const active = activeCollectorUi();
  const current = runtime();
  if (!button || !active || !current || resolving) return;
  const action = String(button.dataset.normalEventAction ?? "");
  event.preventDefault();
  event.stopImmediatePropagation();

  if (action === "category:ball") {
    setUi(active.boardIndex, "ball");
    return;
  }
  if (action === "category:medicine") {
    setUi(active.boardIndex, "medicine");
    return;
  }
  if (action === "back") {
    setUi(active.boardIndex, null);
    return;
  }

  resolving = true;
  button.disabled = true;
  try {
    const result = resolveSafariItemCollectorInteraction(current, active.boardIndex, action);
    if (result.persistenceRequested || result.operations?.some((operation) => operation.op === "request_save")) {
      saveSafariPlayableRun(window.localStorage, current);
    }
    if (result.completed) globalThis.__maplessNormalEventUi = null;
    else setUi(active.boardIndex, active.category ?? null);
    publish("safari-runtime-changed");
    if (!result.completed) publish("safari-normal-event-ui");
  } catch (error) {
    globalThis.__maplessLastError = error;
    const currentState = state();
    if (currentState) currentState.notice = `イベントエラー: ${error?.message ?? error}`;
    publish("safari-runtime-changed");
  } finally {
    resolving = false;
  }
}, { capture:true });
