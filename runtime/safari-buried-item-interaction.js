import { resolveMaplessBuriedItemV0997 } from "./mapless-buried-item-v0997-flow.js";

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new TypeError("runtime variables.mapless state is required");
  }
  return state;
}

export function resolveSafariBuriedItemInteraction(runtime, index) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "buried_item") throw new Error("buried_item board event is required");
  if (state.battle && !state.battle.completed) return { runtime, result: "battle_active", operations: [] };
  if (state.shop) return { runtime, result: "shop_active", operations: [] };
  if (state.board_consumed?.[index]) return { runtime, result: "already_consumed", operations: [] };

  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  runtime.bag ??= { slots: [], money: 0 };
  runtime.bag.slots ??= [];

  const owner = resolveMaplessBuriedItemV0997({
    day: state.day,
    index,
    slots: runtime.bag.slots,
    maxSlots: 20,
    maxPerSlot: 99,
  });
  runtime.bag.slots = owner.slots;
  state.board_consumed[index] = true;
  state.last_operations = [
    ...owner.operations.map((operation) => structuredClone(operation)),
    { op: "request_save", source: "buried_item", index },
  ];
  state.notice = owner.success
    ? `${owner.item}を拾いました。`
    : "掘り出した物は、これ以上持ちきれませんでした。";

  return {
    runtime,
    result: owner.result,
    completed: true,
    item: owner.item,
    quantity: owner.quantity,
    seed: owner.seed,
    notice: state.notice,
    operations: state.last_operations,
    persistenceRequested: true,
    owner,
  };
}

export function interactiveSafariBuriedItem(runtime, index) {
  const result = resolveSafariBuriedItemInteraction(runtime, index);
  return { ...result, boundary: "buried_item" };
}
