import { resolveRewardTransaction } from "./bag-economy-reward-transaction.js";
import { resolveTravelingCook } from "./mapless-normal-events-a3-flow.js";
import { ensureMaplessRunLifecycleState, finishMaplessRun, maplessPartyAllFainted } from "./mapless-run-end-lifecycle.js";
import { damageSafariPokemonFlat, healSafariPartyPercent, inflictSafariOverworldStatus } from "./safari-pokemon-healing.js";
import { updatePokemonRuntime } from "./pokemon-runtime.js";

const SAFARI_BAG_MAX_SLOTS = 20;
const SAFARI_BAG_MAX_PER_SLOT = 99;

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}
function scalingValue(day) { return Math.max(Math.floor((Math.max(1, Number(day) || 1) - 1) / 5), 0); }
function party(runtime) { return runtime.player?.party ?? []; }
function usable(pokemon) { return Boolean(pokemon) && Number(pokemon.hp ?? 0) > 0 && pokemon.egg !== true; }
function berrySlots(runtime) {
  return (runtime.bag?.slots ?? []).filter((slot) => Array.isArray(slot) && Number(slot[1]) > 0 && /BERRY$/i.test(String(slot[0] ?? "")));
}
export function safariTravelingCookBerryCount(runtime) {
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
function itemMeta(ids) {
  return Object.fromEntries([...new Set(ids)].map((id) => [id, { valid:true, pocket:"general" }]));
}
function consumeBerries(runtime, quantity = 3) {
  const costs = berryCosts(runtime, quantity);
  if (costs.length === 0) return null;
  return resolveRewardTransaction({
    pockets:{ general:{ slots:runtime.bag?.slots ?? [], maxSlots:SAFARI_BAG_MAX_SLOTS, maxPerSlot:SAFARI_BAG_MAX_PER_SLOT } },
    itemMeta:itemMeta(costs.map((entry) => entry.item)),
    items:[],
    costs,
  });
}
function applyBagTransaction(runtime, transaction) {
  if (!transaction?.success) return [];
  runtime.bag ??= { slots:[], money:0 };
  runtime.bag.slots = transaction.pockets.general.slots.filter(Boolean);
  return transaction.consumed.map((entry) => ({ op:"runtime_remove_item", item:entry.item, quantity:entry.quantity }));
}
function cureSafariPartyStatus(runtime) {
  runtime.player ??= { party: [] };
  runtime.player.party = (runtime.player.party ?? []).map((pokemon) => pokemon ? updatePokemonRuntime(pokemon, {
    status: "NONE",
    status_count: 0,
    mapless_overworld_confusion: false,
  }) : pokemon);
}
function applyFlatPartyDamage(runtime, amount) {
  const applied = [];
  runtime.player ??= { party:[] };
  runtime.player.party = (runtime.player.party ?? []).map((pokemon, index) => {
    if (!usable(pokemon)) return pokemon;
    applied.push({ op:"runtime_damage_pokemon", party_index:index, amount:Number(amount) });
    return damageSafariPokemonFlat(pokemon, amount);
  });
  return applied;
}
function finishCookPartyWipe(runtime) {
  const state = ensureMaplessRunLifecycleState(runtime);
  if (!state.mapless_run_active || !maplessPartyAllFainted(party(runtime))) return { finished:false, overflow:false, operations:[] };
  state.mapless_run_end_pending = true;
  const finished = finishMaplessRun(runtime);
  state.location = "home";
  return {
    ...finished,
    operations:[
      { op:"mark_run_end", reason:"party_wipe", source:"normal_event:traveling_cook" },
      ...(finished.operations ?? []),
      { op:"return_to_home", source:"normal_event:traveling_cook" },
    ],
  };
}
function applyMeal(runtime, meal, applied) {
  if (meal === "heal") {
    healSafariPartyPercent(runtime, 50);
    applied.push({ op:"runtime_heal_party_percent", amount:50, revive:false });
    return true;
  }
  if (meal === "medicine") {
    cureSafariPartyStatus(runtime);
    applied.push({ op:"runtime_heal_party_status" });
    return true;
  }
  return false;
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
  const availableActions = ["pay", "berries", "prototype", "leave"];
  if (!availableActions.includes(action)) return { runtime, result:"unsupported_action", completed:false, operations:[], availableActions };

  if ((action === "pay" || action === "berries") && meal === "power") {
    state.notice = "力の出る料理はBattle側のpower meal効果がまだ未接続のため選べません。";
    return { runtime, result:"power_meal_owner_missing", completed:false, operations:[], notice:state.notice, persistenceRequested:false, availableActions };
  }

  let transaction = null;
  if (action === "berries") {
    if (safariTravelingCookBerryCount(runtime) < 3) {
      state.notice = "料理を頼むにはきのみが3個必要です。";
      return { runtime, result:"not_enough_berries", completed:false, operations:[], notice:state.notice, persistenceRequested:false, availableActions };
    }
    if (!meal || !["heal", "medicine"].includes(meal)) {
      state.notice = "作ってもらう料理を選んでください。";
      return { runtime, result:"meal_required", completed:false, operations:[], notice:state.notice, persistenceRequested:false, availableActions };
    }
    transaction = consumeBerries(runtime, 3);
    if (!transaction?.success) {
      state.notice = "きのみ3個を安全に消費できませんでした。持ち物は変更していません。";
      state.last_operations = (transaction?.operations ?? []).map((operation) => structuredClone(operation));
      return { runtime, result:transaction?.result ?? "berry_consume_failed", completed:false, operations:state.last_operations, notice:state.notice, persistenceRequested:false, availableActions };
    }
  }

  if (action === "prototype") {
    const preview = resolveTravelingCook({ event, action:"prototype", scaling_value:scaling });
    if (preview.outcome === "prototype_power") {
      state.notice = "試作品は力が湧く料理でしたが、Battle側のpower meal効果がまだ未接続です。イベントは消費していません。";
      state.last_operations = [{ op:"power_meal_owner_missing", battles:1 }];
      return { runtime, result:"power_meal_owner_missing", completed:false, operations:state.last_operations, notice:state.notice, persistenceRequested:false, owner:preview, availableActions };
    }
    const applied = [];
    if (preview.outcome === "prototype_heal") applyMeal(runtime, "heal", applied);
    else if (preview.outcome === "prototype_medicine") applyMeal(runtime, "medicine", applied);
    else if (preview.outcome === "prototype_confusion") {
      const targetIndex = party(runtime).findIndex((pokemon) => usable(pokemon));
      if (targetIndex >= 0) {
        party(runtime)[targetIndex] = inflictSafariOverworldStatus(party(runtime)[targetIndex], "CONFUSION");
        applied.push({ op:"runtime_inflict_status", party_index:targetIndex, status:"CONFUSION" });
      }
    } else if (preview.outcome === "prototype_damage") applied.push(...applyFlatPartyDamage(runtime, 10));

    state.board_events[index] = preview.event;
    state.board_consumed[index] = Boolean(preview.event.normal_resolved);
    const eventOperations = [...preview.operations.map((operation) => structuredClone(operation)), ...applied];
    state.last_operations = eventOperations;
    state.notice = preview.outcome === "prototype_heal" ? "試作品は大当たりで、手持ちのHPが回復しました。"
      : preview.outcome === "prototype_medicine" ? "試作品の薬効で、手持ちの状態異常が治りました。"
        : preview.outcome === "prototype_confusion" ? "試作品の味が強烈で、先頭のポケモンが混乱しました。"
          : "試作品が刺激的すぎて、手持ちが10ダメージを受けました。";
    const runEnd = preview.outcome === "prototype_damage" ? finishCookPartyWipe(runtime) : { finished:false, overflow:false, operations:[] };
    if (runEnd.finished) {
      state.notice = "試作品のダメージで手持ちが全滅したため、今回のランは終了しました。";
      state.last_operations = [...eventOperations, ...(runEnd.operations ?? [])];
    }
    return { runtime, result:preview.outcome, completed:true, price, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner:preview, runEnd };
  }

  const spendSuccess = action !== "pay" || Number(runtime.bag?.money ?? 0) >= price;
  const owner = resolveTravelingCook({
    event,
    action,
    scaling_value: scaling,
    spend_money_success: spendSuccess,
    berry_count:safariTravelingCookBerryCount(runtime),
    consume_berries_success:action === "berries" ? Boolean(transaction?.success) : undefined,
    meal,
  });
  const applied = [];
  if (owner.result && action === "pay") {
    runtime.bag ??= { slots: [], money: 0 };
    runtime.bag.money = Math.max(0, Math.trunc(Number(runtime.bag.money ?? 0)) - price);
    applied.push({ op: "runtime_spend_money", amount: price });
  }
  if (owner.result && (action === "pay" || action === "berries")) applyMeal(runtime, meal, applied);
  if (owner.result && action === "berries") applied.unshift(...applyBagTransaction(runtime, transaction));

  state.board_events[index] = owner.event;
  state.board_consumed[index] = Boolean(owner.event.normal_resolved);
  state.last_operations = [
    ...(owner.operations ?? []).map((op) => structuredClone(op)),
    ...(transaction?.operations ?? []).map((op) => structuredClone(op)),
    ...applied,
  ];
  state.notice = owner.outcome === "paid_heal" ? "料理人の温かい料理で手持ちが回復しました。"
    : owner.outcome === "paid_medicine" ? "薬膳料理で手持ちの状態異常が治りました。"
      : owner.outcome === "berries_heal" ? "きのみ3個で料理を作ってもらい、手持ちのHPが回復しました。"
        : owner.outcome === "berries_medicine" ? "きのみ3個で薬膳料理を作ってもらい、状態異常が治りました。"
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
