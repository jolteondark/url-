import {
  openSafariCrumblingBridgeTouch,
  resolveSafariCrumblingBridgeInteraction,
  safariCrumblingBridgePresentation,
} from "./runtime/safari-crumbling-bridge-interaction.js?v=20260902-0312";
import { persistSafariOwnerResult } from "./day-board-direct-persistence-handoff.js?v=20260902-0312";

let resolving = false;
function runtime() { return globalThis.__maplessSafariRuntime ?? null; }
function state() { return runtime()?.variables?.mapless ?? null; }
function bridgeAt(index) {
  const event = state()?.board_events?.[index];
  return event?.kind === "normal_event" && event?.normal_event_id === "crumbling_bridge" ? event : null;
}
function activeUi() {
  const active = globalThis.__maplessNormalEventUi ?? null;
  return active?.runtime === runtime() && active?.eventId === "crumbling_bridge" ? active : null;
}
function publish(name) {
  if (typeof globalThis.CustomEvent !== "function") return;
  globalThis.window?.dispatchEvent?.(new CustomEvent(name));
}
function setUi(index) {
  const current = runtime();
  const currentState = state();
  if (!current || !currentState || !bridgeAt(index)) return false;
  const presentation = safariCrumblingBridgePresentation(current, index);
  currentState.notice = presentation.message;
  globalThis.__maplessNormalEventUi = {
    runtime:current,
    boardIndex:index,
    eventId:"crumbling_bridge",
    ...presentation,
  };
  publish("safari-normal-event-ui");
  publish("safari-runtime-changed");
  return true;
}

function openBridge(index) {
  const current = runtime();
  const currentState = state();
  if (!current || !currentState || !bridgeAt(index)) return false;
  if (currentState.location !== "day_board" || currentState.battle || currentState.shop || currentState.board_consumed?.[index]) return false;
  openSafariCrumblingBridgeTouch(current, index);
  return setUi(index);
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-board-index]");
  if (!button || button.disabled) return;
  const index = Number(button.dataset.boardIndex);
  if (!Number.isInteger(index) || !bridgeAt(index)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  try { openBridge(index); }
  catch (error) {
    globalThis.__maplessLastError = error;
    const currentState = state();
    if (currentState) currentState.notice = `イベントエラー: ${error?.message ?? error}`;
    publish("safari-runtime-changed");
  }
}, { capture:true });

document.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-normal-event-action]");
  const active = activeUi();
  const current = runtime();
  if (!button || !active || !current || resolving) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  resolving = true;
  button.disabled = true;
  try {
    const result = resolveSafariCrumblingBridgeInteraction(current, active.boardIndex, String(button.dataset.normalEventAction ?? ""));
    persistSafariOwnerResult(current, result);
    if (result.completed) globalThis.__maplessNormalEventUi = null;
    else setUi(active.boardIndex);
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
