export * from "./safari-wishing-fountain-final-routes.js";

import { resolveWishingFountain } from "./mapless-wishing-fountain-flow.js";
import { maplessNormalEventScalingValue } from "./mapless-normal-event-medium-reward.js";

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}

function eventAt(runtime, index) {
  const event = stateOf(runtime).board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "wishing_fountain") throw new Error("wishing_fountain board event is required");
  return event;
}

export function safariWishingFountainLargeWishNeedsPokemon(runtime, index) {
  const event = eventAt(runtime, index);
  const scale = maplessNormalEventScalingValue(stateOf(runtime).day);
  const price = 1200 + scale * 200;
  const money = Math.max(0, Math.trunc(Number(runtime?.bag?.money ?? 0)));
  if (money < price) return false;

  const preview = resolveWishingFountain({
    event,
    action:"large_wish",
    scaling_value:scale,
    spend_result:true,
    chosen_pokemon:null,
    bonus_result:true,
  });
  return (preview.operations ?? []).some((operation) => operation?.op === "choose_pokemon");
}
