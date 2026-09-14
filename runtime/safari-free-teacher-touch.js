import {
  resolveSafariFreeTeacherInteraction,
  safariFreeTeacherPresentation,
} from "./safari-free-teacher-interaction.js";

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

function publish(runtime, index, eventId, ui, result = null) {
  const state = stateOf(runtime);
  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  state.notice = ui.message ?? result?.notice ?? state.notice;
  globalThis.__maplessNormalEventUi = {
    runtime,
    boardIndex:index,
    eventId,
    ...ui,
    result,
  };
  signalNormalEventUi();
}

export function openSafariFreeTeacherTouch(runtime, index) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "normal_event" || !["bloodline_grandmother", "retired_warrior"].includes(event.normal_event_id)) {
    throw new Error("free-teacher normal event is required");
  }
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", operations:[] };
  const ui = safariFreeTeacherPresentation(runtime, index);
  publish(runtime, index, event.normal_event_id, ui);
  return {
    runtime,
    result:"free_teacher_ready",
    boundary:"normal_event",
    notice:state.notice,
    selection:ui.selection,
    operations:[],
    persistenceRequested:false,
  };
}

export function continueSafariFreeTeacherTouch(runtime, index, action = {}) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  const eventId = event?.normal_event_id;
  const result = resolveSafariFreeTeacherInteraction(runtime, index, action);
  if (result.terminal) {
    globalThis.__maplessNormalEventUi = null;
    signalNormalEventUi();
    return result;
  }
  const ui = {
    title:eventId === "bloodline_grandmother" ? "血統のおばあさん" : "引退した戦士",
    message:result.notice ?? state.notice ?? "選択してください。",
    selection:result.selection ?? null,
  };
  publish(runtime, index, eventId, ui, result);
  return result;
}
