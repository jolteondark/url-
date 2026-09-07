import { safariWishingFountainPresentation } from "./safari-wishing-fountain-final-routes.js";

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

export function openSafariWishingFountainTouch(runtime, index) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "wishing_fountain") {
    throw new Error("wishing_fountain board event is required");
  }
  if (state.battle && !state.battle.completed) return { runtime, result:"battle_active", operations:[] };
  if (state.shop) return { runtime, result:"shop_active", operations:[] };
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", operations:[] };

  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  const presentation = safariWishingFountainPresentation(runtime, index);
  state.notice = presentation.message;
  globalThis.__maplessNormalEventUi = {
    runtime,
    boardIndex:index,
    eventId:"wishing_fountain",
    title:presentation.title,
    message:presentation.message,
    actions:presentation.actions,
  };
  signalNormalEventUi();
  return {
    runtime,
    result:"wishing_fountain_ready",
    boundary:"normal_event",
    notice:state.notice,
    operations:[],
  };
}
