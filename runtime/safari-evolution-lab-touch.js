import { safariEvolutionLabPresentation } from "./safari-evolution-lab-interaction.js";

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

export function openSafariEvolutionLabTouch(runtime, index) {
  const state = stateOf(runtime);
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", operations:[] };
  const ui = safariEvolutionLabPresentation(runtime, index);
  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  state.notice = ui.message;
  globalThis.__maplessNormalEventUi = {
    runtime,
    boardIndex:index,
    eventId:"evolution_lab",
    ...ui,
  };
  signalNormalEventUi();
  return {
    runtime,
    result:"evolution_lab_ready",
    boundary:"normal_event",
    notice:state.notice,
    availableActions:ui.actions.map((entry) => entry.id),
    operations:[],
    persistenceRequested:false,
  };
}
