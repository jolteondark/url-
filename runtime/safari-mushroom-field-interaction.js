import { resolveMushroomField } from "./mapless-normal-events-a1-flow.js";
import { maplessCarryMoneyGain } from "./mapless-carry-class-rules.js";
import { setMoney } from "./bag-economy-mart-flow.js";

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}
function scalingValue(day) { return Math.max(Math.floor((Math.max(1, Number(day) || 1) - 1) / 5), 0); }

export function resolveSafariMushroomFieldInteraction(runtime, index, action) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "mushroom_field") throw new Error("mushroom_field board event is required");
  if (state.battle && !state.battle.completed) return { runtime, result: "battle_active", operations: [] };
  if (state.shop) return { runtime, result: "shop_active", operations: [] };
  if (state.board_consumed?.[index]) return { runtime, result: "already_consumed", operations: [] };

  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  const scale = scalingValue(state.day);
  const owner = resolveMushroomField({ event, action, scaling_value: scale });
  const applied = [];
  if (owner.result && action === "sell") {
    const requested = owner.operations.find((operation) => operation.op === "add_money")?.amount ?? 0;
    const carryClass = state.mapless_carry_class ?? "general";
    const adjusted = maplessCarryMoneyGain(requested, carryClass);
    runtime.bag ??= { slots: [], money: 0 };
    const before = Math.trunc(Number(runtime.bag.money ?? 0));
    runtime.bag.money = setMoney(before + adjusted, 9999999);
    applied.push({ op: "runtime_add_money", source: "normal_event:mushroom_field", requested, adjusted, carryClass, applied: runtime.bag.money - before });
  }
  state.board_events[index] = owner.event;
  state.board_consumed[index] = Boolean(owner.event.normal_resolved);
  state.last_operations = [...(owner.operations ?? []).map((operation) => structuredClone(operation)), ...applied];
  state.notice = owner.outcome === "sold"
    ? `怪しいキノコを売り、${applied[0]?.applied ?? 0}円を得ました。`
    : "怪しいキノコ畑から離れました。";
  return { runtime, result: owner.outcome, completed: Boolean(owner.result), operations: state.last_operations, notice: state.notice, persistenceRequested: Boolean(owner.result), owner };
}

export function interactiveSafariMushroomField(runtime, index) {
  const state = stateOf(runtime);
  const scale = scalingValue(state.day);
  const nominal = 400 + scale * 120;
  const carryClass = state.mapless_carry_class ?? "general";
  const displayed = maplessCarryMoneyGain(nominal, carryClass);
  const confirmFn = typeof globalThis.confirm === "function" ? globalThis.confirm.bind(globalThis) : null;
  if (!confirmFn) {
    state.board_revealed[index] = true;
    state.board_visited[index] = true;
    state.notice = `怪しいキノコ畑。採取して売れば${displayed}円になりそうです。`;
    return { runtime, result: "mushroom_field_ready", boundary: "normal_event", notice: state.notice, operations: [] };
  }
  const sell = confirmFn(`怪しいキノコ畑です。\nキノコを採取して${displayed}円で売りますか？\n（キャンセルで立ち去る）`);
  return { ...resolveSafariMushroomFieldInteraction(runtime, index, sell ? "sell" : "leave"), boundary: "normal_event" };
}
