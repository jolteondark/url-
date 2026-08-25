import * as base from "./safari-traveling-cook-interaction-base.js";
import { resolveRewardTransaction } from "./bag-economy-reward-transaction.js";
import { resolveTravelingCook } from "./mapless-normal-events-a3-flow.js";
import { setSafariPowerMeal } from "./mapless-power-meal-runtime.js";

export * from "./safari-traveling-cook-interaction-base.js";

const SAFARI_BAG_MAX_SLOTS = 20;
const SAFARI_BAG_MAX_PER_SLOT = 99;

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}
function scalingValue(day) { return Math.max(Math.floor((Math.max(1, Number(day) || 1) - 1) / 5), 0); }
function berrySlots(runtime) {
  return (runtime.bag?.slots ?? []).filter((slot) => Array.isArray(slot) && Number(slot[1]) > 0 && /BERRY$/i.test(String(slot[0] ?? "")));
}
function berryCount(runtime) {
  return berrySlots(runtime).reduce((sum, slot) => sum + Math.max(0, Math.trunc(Number(slot[1]) || 0)), 0);
}
function berryCosts(runtime, quantity = 3) {
  let remaining = quantity;
  const costs = [];
  for (const [id, rawQty] of berrySlots(runtime)) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, Math.max(0, Math.trunc(Number(rawQty) || 0)));
    if (take > 0) costs.push({ item:String(id), quantity:take });
    remaining -= take;
  }
  return remaining === 0 ? costs : [];
}
function consumeBerries(runtime, quantity = 3) {
  const costs = berryCosts(runtime, quantity);
  if (!costs.length) return null;
  const itemMeta = Object.fromEntries(costs.map(({ item }) => [item, { valid:true, pocket:"general" }]));
  return resolveRewardTransaction({
    pockets:{ general:{ slots:runtime.bag?.slots ?? [], maxSlots:SAFARI_BAG_MAX_SLOTS, maxPerSlot:SAFARI_BAG_MAX_PER_SLOT } },
    itemMeta,
    items:[],
    costs,
  });
}
function applyBerryTransaction(runtime, transaction) {
  if (!transaction?.success) return [];
  runtime.bag ??= { slots:[], money:0 };
  runtime.bag.slots = transaction.pockets.general.slots.filter(Boolean);
  return transaction.consumed.map((entry) => ({ op:"runtime_remove_item", item:entry.item, quantity:entry.quantity }));
}
function commitPowerMeal(runtime, index, owner, battles, extraOperations = []) {
  const state = stateOf(runtime);
  const power = setSafariPowerMeal(runtime, battles);
  state.board_events[index] = owner.event;
  state.board_consumed[index] = Boolean(owner.event.normal_resolved);
  state.last_operations = [
    ...(owner.operations ?? []).map((operation) => structuredClone(operation)),
    ...extraOperations,
    { op:"runtime_set_power_meal", battles:power.battles, day:power.day },
  ];
  state.notice = battles === 1
    ? "試作品の力がみなぎり、次の戦闘で先頭の攻撃と特攻が上がります。"
    : `力の料理で、今日の次の${battles}戦は先頭の攻撃と特攻が上がります。`;
  return {
    runtime,
    result:owner.outcome,
    completed:true,
    operations:state.last_operations,
    notice:state.notice,
    persistenceRequested:true,
    owner,
    powerMeal:power,
  };
}

export function resolveSafariTravelingCookInteraction(runtime, index, action, meal = null) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  const prototypePower = action === "prototype" && Number(event?.normal_data?.prototype_roll) >= 65 && Number(event?.normal_data?.prototype_roll) < 85;
  if (meal !== "power" && !prototypePower) return base.resolveSafariTravelingCookInteraction(runtime, index, action, meal);
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "traveling_cook") throw new Error("traveling_cook board event is required");
  if (state.battle && !state.battle.completed) return { runtime, result:"battle_active", operations:[] };
  if (state.shop) return { runtime, result:"shop_active", operations:[] };
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", operations:[] };
  state.board_revealed[index] = true;
  state.board_visited[index] = true;

  const scaling = scalingValue(state.day);
  const price = 600 + scaling * 100;
  if (prototypePower) {
    const owner = resolveTravelingCook({ event, action:"prototype", scaling_value:scaling });
    if (owner.outcome !== "prototype_power") throw new Error("traveling_cook prototype power projection changed unexpectedly");
    return commitPowerMeal(runtime, index, owner, 1);
  }

  if (action === "pay") {
    const spendSuccess = Number(runtime.bag?.money ?? 0) >= price;
    const owner = resolveTravelingCook({
      event,
      action:"pay",
      scaling_value:scaling,
      spend_money_success:spendSuccess,
      meal:"power",
    });
    if (!owner.result) {
      state.last_operations = (owner.operations ?? []).map((operation) => structuredClone(operation));
      state.notice = `料理には${price}円必要です。`;
      return { runtime, result:owner.outcome, completed:false, price, operations:state.last_operations, notice:state.notice, persistenceRequested:false, owner };
    }
    runtime.bag ??= { slots:[], money:0 };
    runtime.bag.money = Math.max(0, Math.trunc(Number(runtime.bag.money ?? 0)) - price);
    return { ...commitPowerMeal(runtime, index, owner, 3, [{ op:"runtime_spend_money", amount:price }]), price };
  }

  if (action === "berries") {
    const count = berryCount(runtime);
    if (count < 3) {
      state.notice = "料理を頼むにはきのみが3個必要です。";
      return { runtime, result:"not_enough_berries", completed:false, operations:[], notice:state.notice, persistenceRequested:false };
    }
    const transaction = consumeBerries(runtime, 3);
    const owner = resolveTravelingCook({
      event,
      action:"berries",
      scaling_value:scaling,
      berry_count:count,
      consume_berries_success:Boolean(transaction?.success),
      meal:"power",
    });
    if (!transaction?.success || !owner.result) {
      state.last_operations = [
        ...(owner.operations ?? []).map((operation) => structuredClone(operation)),
        ...(transaction?.operations ?? []).map((operation) => structuredClone(operation)),
      ];
      state.notice = "きのみ3個を安全に消費できませんでした。持ち物は変更していません。";
      return { runtime, result:owner.outcome, completed:false, operations:state.last_operations, notice:state.notice, persistenceRequested:false, owner };
    }
    const applied = applyBerryTransaction(runtime, transaction);
    return commitPowerMeal(runtime, index, owner, 3, [
      ...(transaction.operations ?? []).map((operation) => structuredClone(operation)),
      ...applied,
    ]);
  }

  return base.resolveSafariTravelingCookInteraction(runtime, index, action, meal);
}

function chooseAction(confirmFn, promptFn, price) {
  if (promptFn) {
    const raw = String(promptFn(`旅の料理人\\n1: きのみ3個で料理\\n2: ${price}円で料理\\n3: 試作品（無料・危険あり）\\n0: 立ち去る`, "2") ?? "0").trim();
    return ({ "1":"berries", "2":"pay", "3":"prototype" })[raw] ?? "leave";
  }
  if (confirmFn(`${price}円で料理を頼みますか？\\n（キャンセルで別の方法）`)) return "pay";
  if (confirmFn("きのみ3個で料理を作ってもらいますか？\\n（キャンセルで別の方法）")) return "berries";
  return confirmFn("無料の試作品を食べますか？\\n（キャンセルで立ち去る）") ? "prototype" : "leave";
}
function chooseMeal(confirmFn, promptFn) {
  if (promptFn) {
    const raw = String(promptFn("料理を選んでください。\\n1: 回復料理\\n2: 薬膳料理\\n3: 力の料理\\n0: やめる", "1") ?? "0").trim();
    return ({ "1":"heal", "2":"medicine", "3":"power" })[raw] ?? null;
  }
  if (confirmFn("回復料理にしますか？\\n（キャンセルで別の料理）")) return "heal";
  if (confirmFn("薬膳料理にしますか？\\n（キャンセルで別の料理）")) return "medicine";
  return confirmFn("力の料理にしますか？\\n（キャンセルで料理選択をやめる）") ? "power" : null;
}

export function interactiveSafariTravelingCook(runtime, index) {
  const state = stateOf(runtime);
  const price = 600 + scalingValue(state.day) * 100;
  const confirmFn = typeof globalThis.confirm === "function" ? globalThis.confirm.bind(globalThis) : null;
  const promptFn = typeof globalThis.prompt === "function" ? globalThis.prompt.bind(globalThis) : null;
  if (!confirmFn && !promptFn) return base.interactiveSafariTravelingCook(runtime, index);

  const action = chooseAction(confirmFn, promptFn, price);
  if (action === "leave" || action === "prototype") {
    return { ...resolveSafariTravelingCookInteraction(runtime, index, action), boundary:"normal_event" };
  }
  const meal = chooseMeal(confirmFn, promptFn);
  return { ...resolveSafariTravelingCookInteraction(runtime, index, action, meal), boundary:"normal_event" };
}
