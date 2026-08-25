import {
  safariBerryJuiceShopActions,
  safariBerryJuiceShopMessage,
} from "./runtime/safari-berry-juice-shop-interaction.js?v=20260825-2300";

function runtime() { return globalThis.__maplessSafariRuntime ?? null; }
function state() { return runtime()?.variables?.mapless ?? null; }
function shopAt(index) {
  const event = state()?.board_events?.[index];
  return event?.kind === "normal_event" && event?.normal_event_id === "berry_juice_shop" ? event : null;
}
function publish(name) {
  if (typeof globalThis.CustomEvent !== "function") return;
  globalThis.window?.dispatchEvent?.(new CustomEvent(name));
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
