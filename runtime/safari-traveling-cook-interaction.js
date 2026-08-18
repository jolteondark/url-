import { resolveTravelingCook } from "./mapless-normal-events-a3-flow.js";
import { healSafariPartyPercent } from "./safari-pokemon-healing.js";
import { updatePokemonRuntime } from "./pokemon-runtime.js";

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}
function scalingValue(day) { return Math.max(Math.floor((Math.max(1, Number(day) || 1) - 1) / 5), 0); }
function cureSafariPartyStatus(runtime) {
  runtime.player ??= { party: [] };
  runtime.player.party = (runtime.player.party ?? []).map((pokemon) => pokemon ? updatePokemonRuntime(pokemon, {
    status: "NONE",
    status_count: 0,
    mapless_overworld_confusion: false,
  }) : pokemon);
}

export function resolveSafariTravelingCookInteraction(runtime, index, action, meal = null) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "traveling_cook") throw new Error("traveling_cook board event is required");
  if (state.battle && !state.battle.completed) return { runtime, result: "battle_active", operations: [] };
  if (state.shop) return { runtime, result: "shop_active", operations: [] };
  if (state.board_consumed?.[index]) return { runtime, result: "already_consumed", operations: [] };
  state.board_revealed[index] = true;
  state.board_visited[index] = true;

  const scaling = scalingValue(state.day);
  const price = 600 + scaling * 100;
  const spendSuccess = action !== "pay" || Number(runtime.bag?.money ?? 0) >= price;
  const owner = resolveTravelingCook({
    event,
    action,
    scaling_value: scaling,
    spend_money_success: spendSuccess,
    meal,
  });
  const applied = [];
  if (owner.result && action === "pay") {
    runtime.bag ??= { slots: [], money: 0 };
    runtime.bag.money = Math.max(0, Math.trunc(Number(runtime.bag.money ?? 0)) - price);
    applied.push({ op: "runtime_spend_money", amount: price });
    if (meal === "heal") {
      healSafariPartyPercent(runtime, 50);
      applied.push({ op: "runtime_heal_party_percent", amount: 50, revive: false });
    } else if (meal === "medicine") {
      cureSafariPartyStatus(runtime);
      applied.push({ op: "runtime_heal_party_status" });
    }
  }

  state.board_events[index] = owner.event;
  state.board_consumed[index] = Boolean(owner.event.normal_resolved);
  state.last_operations = [...(owner.operations ?? []).map((op) => structuredClone(op)), ...applied];
  state.notice = owner.outcome === "paid_heal" ? "料理人の温かい料理で手持ちが回復しました。"
    : owner.outcome === "paid_medicine" ? "薬膳料理で手持ちの状態異常が治りました。"
      : owner.outcome === "payment_failed" ? `料理には${price}円必要です。`
        : owner.outcome === "left" ? "旅の料理人に別れを告げました。"
          : "旅の料理人が鍋をかき混ぜています。";
  return {
    runtime,
    result: owner.outcome,
    completed: Boolean(owner.result),
    price,
    operations: state.last_operations,
    notice: state.notice,
    persistenceRequested: Boolean(owner.result),
    owner,
  };
}

export function interactiveSafariTravelingCook(runtime, index) {
  const state = stateOf(runtime);
  const price = 600 + scalingValue(state.day) * 100;
  const confirmFn = typeof globalThis.confirm === "function" ? globalThis.confirm.bind(globalThis) : null;
  if (!confirmFn) {
    state.board_revealed[index] = true;
    state.board_visited[index] = true;
    state.notice = `旅の料理人。${price}円で料理を作ってくれます。`;
    return { runtime, result: "traveling_cook_ready", boundary: "normal_event", notice: state.notice, operations: [] };
  }
  const pay = confirmFn(`旅の料理人\n${price}円で料理を頼みますか？\n（キャンセルで立ち去る）`);
  if (!pay) return { ...resolveSafariTravelingCookInteraction(runtime, index, "leave"), boundary: "normal_event" };
  const heal = confirmFn("料理を選んでください。\nOK: 回復料理（HPを50%回復）\nキャンセル: 薬膳料理（状態異常を回復）");
  return { ...resolveSafariTravelingCookInteraction(runtime, index, "pay", heal ? "heal" : "medicine"), boundary: "normal_event" };
}
