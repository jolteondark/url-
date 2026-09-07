import { safariTrainerCampPresentation } from "./safari-trainer-camp-interaction.js";

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

export async function openSafariTrainerCampTouch(runtime, index) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "trainer_camp") {
    throw new Error("trainer_camp board event is required");
  }
  if (state.battle && !state.battle.completed) return { runtime, result:"battle_active", operations:[] };
  if (state.shop) return { runtime, result:"shop_active", operations:[] };
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", operations:[] };

  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  const presentation = await safariTrainerCampPresentation(runtime, index);
  state.notice = presentation.message;
  globalThis.__maplessNormalEventUi = {
    runtime,
    boardIndex:index,
    eventId:"trainer_camp",
    title:presentation.title,
    message:presentation.message,
    actions:presentation.actions,
  };
  signalNormalEventUi();
  return {
    runtime,
    result:"trainer_camp_ready",
    boundary:"normal_event",
    notice:state.notice,
    operations:[],
  };
}
