import { resolveWishingFountain } from "./mapless-wishing-fountain-flow.js";
import {
  MAPLESS_NORMAL_EVENT_SMALL_REWARD_ITEMS,
  resolveMaplessNormalEventSmallReward,
} from "./mapless-normal-event-small-reward.js";
import { MAPLESS_NORMAL_EVENT_MID_REWARD_ITEMS, maplessNormalEventScalingValue } from "./mapless-normal-event-medium-reward.js";
import {
  MAPLESS_NORMAL_EVENT_LARGE_REWARD_ITEMS,
  resolveMaplessNormalEventLargeReward,
} from "./mapless-normal-event-large-reward.js";
import { borrowSafariSharedRunRandomInt, ensureSafariEncounterSeed } from "./safari-encounter-randomization.js";
import { healSafariPartyPercent } from "./safari-pokemon-healing.js";

const SAFARI_BAG_MAX_SLOTS = 20;
const SAFARI_BAG_MAX_PER_SLOT = 99;
const SMALL_ITEM_META = Object.freeze(Object.fromEntries(
  MAPLESS_NORMAL_EVENT_SMALL_REWARD_ITEMS.map((id) => [id, Object.freeze({ valid:true, pocket:"general" })]),
));
const LARGE_ITEM_META = Object.freeze(Object.fromEntries(
  [...MAPLESS_NORMAL_EVENT_MID_REWARD_ITEMS, ...MAPLESS_NORMAL_EVENT_LARGE_REWARD_ITEMS]
    .map((id) => [id, Object.freeze({ valid:true, pocket:"general" })]),
));

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
function rewardPockets(runtime) {
  return { general:{ slots:runtime?.bag?.slots ?? [], maxSlots:SAFARI_BAG_MAX_SLOTS, maxPerSlot:SAFARI_BAG_MAX_PER_SLOT } };
}
function sharedSmallReward(runtime) {
  const state = stateOf(runtime);
  ensureSafariEncounterSeed(state);
  const counter = state.preview_encounter_counter;
  const reward = resolveMaplessNormalEventSmallReward({
    count:1,
    randomInt:(max) => borrowSafariSharedRunRandomInt(runtime, max),
    itemMeta:SMALL_ITEM_META,
    pockets:rewardPockets(runtime),
  });
  if (!reward.success) state.preview_encounter_counter = counter;
  return reward;
}
function sharedLargeReward(runtime) {
  const state = stateOf(runtime);
  ensureSafariEncounterSeed(state);
  const counter = state.preview_encounter_counter;
  const reward = resolveMaplessNormalEventLargeReward({
    day:Math.max(1, Math.trunc(Number(state.day) || 1)),
    count:1,
    randomInt:(max) => borrowSafariSharedRunRandomInt(runtime, max),
    itemMeta:LARGE_ITEM_META,
    pockets:rewardPockets(runtime),
  });
  if (!reward.success) state.preview_encounter_counter = counter;
  return reward;
}
function applyReward(runtime, reward) {
  if (!reward?.success) return [];
  runtime.bag ??= { slots:[], money:0 };
  runtime.bag.slots = reward.pockets.general.slots.filter(Boolean);
  return (reward.granted ?? []).map((entry) => ({ op:"runtime_grant_item", item:entry.item, quantity:entry.quantity }));
}
function commit(runtime, index, owner, applied = []) {
  const state = stateOf(runtime);
  state.board_events[index] = owner.event;
  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  state.board_consumed[index] = Boolean(owner.event.normal_resolved);
  state.last_operations = [
    ...(owner.operations ?? []).map((operation) => structuredClone(operation)),
    ...applied,
    { op:"request_save", reason:"wishing_fountain_resolved" },
  ];
  return state;
}
function scalingValue(runtime) { return maplessNormalEventScalingValue(stateOf(runtime).day); }

export function safariWishingFountainPresentation(runtime, index) {
  const state = stateOf(runtime);
  const event = eventAt(runtime, index);
  const largePrice = 1200 + scalingValue(runtime) * 200;
  return {
    title:"願いの泉",
    message:"静かな泉があります。願いを捧げるか、泉へ手を伸ばせます。",
    actions:[
      { id:"small_wish", label:"200円で小さな願い", meta:"回復・小さな道具・何も起きない、のいずれか" },
      { id:"large_wish", label:`${largePrice}円で大きな願い`, meta:"大きな道具など。個体強化/全回復結果は共有owner接続待ち" },
      { id:"reach", label:"泉へ手を伸ばす", meta:"お金/大きな道具結果は接続済み。戦闘/状態異常結果は共有owner接続待ち" },
      { id:"leave", label:"立ち去る", secondary:true },
    ],
    event,
  };
}

export function resolveSafariWishingFountainInteraction(runtime, index, requestedAction) {
  const state = stateOf(runtime);
  const event = eventAt(runtime, index);
  if (state.battle && !state.battle.completed) return { runtime, result:"battle_active", completed:false, operations:[] };
  if (state.shop) return { runtime, result:"shop_active", completed:false, operations:[] };
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", completed:true, operations:[] };
  state.board_revealed[index] = true;
  state.board_visited[index] = true;

  const action = String(requestedAction ?? "");
  if (action === "leave") {
    const owner = resolveWishingFountain({ event, action:"leave" });
    commit(runtime, index, owner);
    state.notice = "願いの泉を離れました。";
    return { runtime, result:owner.outcome, completed:true, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
  }

  if (action === "large_wish") {
    const scale = scalingValue(runtime);
    const price = 1200 + scale * 200;
    const money = Math.max(0, Math.trunc(Number(runtime.bag?.money ?? 0)));
    if (money < price) {
      const owner = resolveWishingFountain({ event, action:"large_wish", scaling_value:scale, spend_result:false });
      state.notice = `大きな願いには${price}円必要です。`;
      return { runtime, result:owner.outcome, completed:false, operations:owner.operations ?? [], notice:state.notice, persistenceRequested:false, owner };
    }
    const roll = Number(event.normal_data?.large_roll ?? 0);
    if ((roll >= 45 && roll < 85)) {
      state.notice = roll < 65
        ? "この大きな願いは個体強化の共有owner接続待ちです。お金もイベントも消費していません。"
        : "この大きな願いは全回復の共有owner接続待ちです。お金もイベントも消費していません。";
      return { runtime, result:roll < 65 ? "pokemon_bonus_owner_pending" : "full_heal_owner_pending", completed:false, operations:[], notice:state.notice, persistenceRequested:false };
    }
    let reward = null;
    if (roll < 45 || (roll >= 85 && roll < 95)) {
      reward = sharedLargeReward(runtime);
      if (!reward.success) {
        state.notice = "願いの道具を受け取るバッグの空きがありません。お金もイベントも消費していません。";
        return { runtime, result:"reward_bag_full", completed:false, operations:reward.operations ?? [], notice:state.notice, persistenceRequested:false, reward };
      }
    }
    const owner = resolveWishingFountain({ event, action:"large_wish", scaling_value:scale, spend_result:true, reward_result:reward?.success ?? true });
    runtime.bag ??= { slots:[], money:0 };
    runtime.bag.money = money - price;
    const applied = [{ op:"runtime_spend_money", amount:price }];
    if (reward) {
      applied.push(...(reward.operations ?? []).map((operation) => structuredClone(operation)));
      applied.push(...applyReward(runtime, reward));
    }
    commit(runtime, index, owner, applied);
    state.notice = reward
      ? `${price}円を捧げると、${reward.selectedItems?.join("・") ?? "道具"}を授かりました。`
      : `${price}円を捧げましたが、泉は静かなままでした。`;
    return { runtime, result:owner.outcome, completed:true, reward, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
  }

  if (action === "reach") {
    const scale = scalingValue(runtime);
    const roll = Number(event.normal_data?.reach_roll ?? 0);
    if (roll >= 40 && roll < 90) {
      state.notice = roll < 70
        ? "泉の戦闘結果は共有Battle接続待ちです。イベントは消費していません。"
        : "泉の状態異常結果は共有status owner接続待ちです。イベントは消費していません。";
      return { runtime, result:roll < 70 ? "reach_battle_owner_pending" : "reach_status_owner_pending", completed:false, operations:[], notice:state.notice, persistenceRequested:false };
    }
    if (roll < 40) {
      const owner = resolveWishingFountain({ event, action:"reach", scaling_value:scale, money_result:true });
      const amount = 500 + scale * 150;
      runtime.bag ??= { slots:[], money:0 };
      runtime.bag.money = Math.max(0, Math.trunc(Number(runtime.bag.money ?? 0))) + amount;
      commit(runtime, index, owner, [{ op:"runtime_add_money", amount }]);
      state.notice = `泉の底で${amount}円を見つけました。`;
      return { runtime, result:owner.outcome, completed:true, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
    }
    const reward = sharedLargeReward(runtime);
    if (!reward.success) {
      state.notice = "泉の道具を受け取るバッグの空きがありません。イベントは消費していません。";
      return { runtime, result:"reward_bag_full", completed:false, operations:reward.operations ?? [], notice:state.notice, persistenceRequested:false, reward };
    }
    const owner = resolveWishingFountain({ event, action:"reach", scaling_value:scale, reward_result:true });
    const applied = [
      ...(reward.operations ?? []).map((operation) => structuredClone(operation)),
      ...applyReward(runtime, reward),
    ];
    commit(runtime, index, owner, applied);
    state.notice = `泉から${reward.selectedItems?.join("・") ?? "道具"}を拾い上げました。`;
    return { runtime, result:owner.outcome, completed:true, reward, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
  }

  if (action !== "small_wish") {
    return { runtime, result:"unsupported_action", completed:false, operations:[], persistenceRequested:false };
  }

  const price = 200;
  const money = Math.max(0, Math.trunc(Number(runtime.bag?.money ?? 0)));
  if (money < price) {
    const owner = resolveWishingFountain({ event, action:"small_wish", spend_result:false });
    state.notice = "小さな願いには200円必要です。";
    return { runtime, result:owner.outcome, completed:false, operations:owner.operations ?? [], notice:state.notice, persistenceRequested:false, owner };
  }

  const roll = Number(event.normal_data?.small_roll ?? 0);
  let reward = null;
  if (roll >= 50 && roll < 80) {
    reward = sharedSmallReward(runtime);
    if (!reward.success) {
      state.notice = "願いの道具を受け取るバッグの空きがありません。お金もイベントも消費していません。";
      return { runtime, result:"reward_bag_full", completed:false, operations:reward.operations ?? [], notice:state.notice, persistenceRequested:false, reward };
    }
  }

  const owner = resolveWishingFountain({ event, action:"small_wish", spend_result:true, heal_result:true, reward_result:reward?.success ?? true });
  runtime.bag ??= { slots:[], money:0 };
  runtime.bag.money = money - price;
  const applied = [{ op:"runtime_spend_money", amount:price }];
  if (owner.outcome === "small_heal") {
    healSafariPartyPercent(runtime, 25, { cureStatus:false });
    applied.push({ op:"runtime_heal_party_percent", percent:25, cure_status:false });
  }
  if (reward) {
    applied.push(...(reward.operations ?? []).map((operation) => structuredClone(operation)));
    applied.push(...applyReward(runtime, reward));
  }
  commit(runtime, index, owner, applied);
  state.notice = owner.outcome === "small_heal"
    ? "200円を捧げると、手持ちのHPが25%回復しました。"
    : owner.outcome === "small_reward"
      ? `200円を捧げると、${reward?.selectedItems?.join("・") ?? "道具"}を授かりました。`
      : "200円を捧げましたが、泉は静かなままでした。";
  return { runtime, result:owner.outcome, completed:true, reward, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
}
