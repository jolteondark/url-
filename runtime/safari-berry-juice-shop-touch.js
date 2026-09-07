import {
  safariBerryJuiceShopActions,
  safariBerryJuiceShopMessage,
} from "./safari-berry-juice-shop-interaction.js";

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}

function signalNormalEventUi() {
  if (typeof globalThis.dispatchEvent === "function" && typeof globalThis.CustomEvent === "function") {
    globalThis.dispatchEvent(new CustomEvent("safari-normal-event-ui"));
  }
}

export function openSafariBerryJuiceShopTouch(runtime, index) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "berry_juice_shop") {
    throw new Error("berry_juice_shop board event is required");
  }
  if (state.battle && !state.battle.completed) return { runtime, result:"battle_active", operations:[] };
  if (state.shop) return { runtime, result:"shop_active", operations:[] };
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", operations:[] };

  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  const title = "きのみジュース屋";
  const message = safariBerryJuiceShopMessage(runtime, index);
  const actions = safariBerryJuiceShopActions(runtime, index);
  state.notice = message;
  globalThis.__maplessNormalEventUi = {
    runtime,
    boardIndex:index,
    eventId:"berry_juice_shop",
    title,
    message,
    actions,
  };
  signalNormalEventUi();
  return {
    runtime,
    result:"berry_juice_shop_ready",
    boundary:"normal_event",
    notice:state.notice,
    operations:[],
  };
}
