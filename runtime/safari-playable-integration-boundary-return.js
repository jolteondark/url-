import * as base from "./safari-playable-integration-boundary.js";

export * from "./safari-playable-integration-boundary.js";

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}

export function returnSafariToDayBoard(runtime) {
  const state = stateOf(runtime);
  const wasBoundary = state.battle?.origin === "boundary_trial";
  const decision = Number(state.battle?.decision ?? 0);
  const result = base.returnSafariToDayBoard(runtime);
  if (wasBoundary && decision === 1 && result?.target === "day_board") {
    state.boundary_trial = {
      ...(state.boundary_trial ?? {}),
      trial_cleared: false,
      trial_floor: null,
      result: "returned_to_board",
      battle_request: null,
    };
  }
  return result;
}
