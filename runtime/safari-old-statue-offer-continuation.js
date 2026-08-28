export * from "./safari-old-statue-offer-bonus.js?v=20260826-1825";

import { resolveOldStatue } from "./mapless-old-statue-flow.js";
import { maplessNormalEventScalingValue } from "./mapless-normal-event-medium-reward.js";
import { registerSafariNormalEventBattleContinuation } from "./safari-normal-event-battle-continuation.js";

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}

registerSafariNormalEventBattleContinuation("old_statue", (runtime, continuation) => {
  if (continuation.actionId !== "offer") throw new Error(`unsupported old_statue continuation: ${continuation.actionId}`);
  const state = stateOf(runtime);
  const index = Number(continuation.boardIndex);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "old_statue") throw new Error("old_statue continuation requires originating event");

  const offeredItem = String(continuation.payload?.offered_item ?? "");
  const battleType = String(continuation.payload?.battle_type ?? "");
  if (!offeredItem || !battleType) throw new Error("old_statue offer continuation payload is incomplete");

  const owner = resolveOldStatue({
    event,
    choice:"offer",
    offered_item:offeredItem,
    remove_result:true,
    scaling_value:maplessNormalEventScalingValue(state.day),
    outcome:{ effect_index:0, type_id:battleType },
  });

  state.board_events[index] = owner.event;
  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  state.board_consumed[index] = Boolean(owner.event.normal_resolved);
  state.last_operations = [
    ...(owner.operations ?? [])
      .filter((operation) => !["choose_consumable", "remove_item", "start_wild_battle"].includes(operation?.op))
      .map((operation) => structuredClone(operation)),
    { op:"request_save", reason:"old_statue_offer_post_battle" },
  ];
  state.notice = "供物を受け取った石像との戦いを終えました。";
  return {
    runtime,
    result:owner.outcome,
    completed:true,
    terminal:true,
    operations:state.last_operations,
    notice:state.notice,
    persistenceRequested:true,
    owner,
  };
});
