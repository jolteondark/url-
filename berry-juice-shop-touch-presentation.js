import {
  resolveSafariBerryJuiceShopInteraction,
  safariBerryJuiceShopActions,
  safariBerryJuiceShopMessage,
} from "./runtime/safari-berry-juice-shop-interaction.js?v=20260825-2300";
import { saveSafariPlayableRun } from "./runtime/safari-web-startup.js";

let resolving = false;
function runtime() { return globalThis.__maplessSafariRuntime ?? null; }
function state() { return runtime()?.variables?.mapless ?? null; }
function shopAt(index) {
  const event = state()?.board_events?.[index];
  return event?.kind === "normal_event" && event?.normal_event_id === "berry_juice_shop" ? event : null;
}
function activeShopUi() {
  const active = globalThis.__maplessNormalEventUi ?? null;
  return active?.runtime === runtime() && active?.eventId === "berry_juice_shop" ? active : null;
}
function publish(name) {
  if (typeof globalThis.CustomEvent !== "function") return;
  globalThis.window?.dispatchEvent?.(new CustomEvent(name));
}
function refreshActive() {
  const current = runtime();
  const active = activeShopUi();
  if (!current || !active || !shopAt(active.boardIndex)) return;
  active.message = safariBerryJuiceShopMessage(current, active.boardIndex);
  active.actions = safariBerryJuiceShopActions(current, active.boardIndex);
}
function openBerryJuiceShop(index) {
  const current = runtime();
  const currentState = state();
  const event = shopAt(index);
  if (!current || !currentState || !event) return false;
  if (currentState.location !== "day_board" || currentState.battle || currentState.shop || currentState.board_consumed?.[index]) return false;
  currentState.board_revealed[index] = true;
  currentState.board_visited[index] = true;
  const message = safariBerryJuiceShopMessage(current, index);
  currentState.notice = message;
  globalThis.__maplessNormalEventUi = {
    runtime:current,
    boardIndex:index,
    eventId:"berry_juice_shop",
    title:"きのみジュース屋",
    message,
    actions:safariBerryJuiceShopActions(current, index),
  };
  publish("safari-normal-event-ui");
  publish("safari-runtime-changed");
  return true;
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-board-index]");
  if (!button || button.disabled) return;
  const index = Number(button.dataset.boardIndex);
  if (!Number.isInteger(index) || !shopAt(index)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  openBerryJuiceShop(index);
}, { capture:true });

document.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-normal-event-action]");
  const active = activeShopUi();
  const current = runtime();
  if (!button || !active || !current || resolving) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  resolving = true;
  button.disabled = true;
  try {
    const result = resolveSafariBerryJuiceShopInteraction(current, active.boardIndex, button.dataset.normalEventAction);
    if (result.persistenceRequested || result.operations?.some((operation) => operation.op === "request_save")) {
      saveSafariPlayableRun(window.localStorage, current);
    }
    if (result.completed) globalThis.__maplessNormalEventUi = null;
    else refreshActive();
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

window.addEventListener("safari-runtime-changed", refreshActive, { passive:true });
