import { resolveWishingFountain } from "./mapless-wishing-fountain-flow.js";
import {
  MAPLESS_NORMAL_EVENT_SMALL_REWARD_ITEMS,
  resolveMaplessNormalEventSmallReward,
} from "./mapless-normal-event-small-reward.js";
import { borrowSafariSharedRunRandomInt, ensureSafariEncounterSeed } from "./safari-encounter-randomization.js";
import { healSafariPartyPercent } from "./safari-pokemon-healing.js";

const SAFARI_BAG_MAX_SLOTS = 20;
const SAFARI_BAG_MAX_PER_SLOT = 99;
const SMALL_ITEM_META = Object.freeze(Object.fromEntries(
  MAPLESS_NORMAL_EVENT_SMALL_REWARD_ITEMS.map((id) => [id, Object.freeze({ valid:true, pocket:"general" })]),
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

export function safariWishingFountainPresentation(runtime, index) {
  const state = stateOf(runtime);
  const event = eventAt(runtime, index);
  const largePrice = 1200 + Math.max(0, Math.floor((Math.max(1, Number(state.day) || 1) - 1) / 5)) * 200;
  return {
    title:"願いの泉",
    message:"静かな泉があります。小さな願いは今すぐ捧げられます。",
    actions:[
      { id:"small_wish", label:"200円で小さな願い", meta:"回復・小さな道具・何も起きない、のいずれか" },
      { id:"large_wish", label:`${largePrice}円で大きな願い`, meta:"大報酬owner接続待ち" },
      { id:"reach", label:"泉へ手を伸ばす", meta:"一部結果が大報酬owner接続待ち" },
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

  if (action === "large_wish" || action === "reach") {
    state.notice = action === "large_wish"
      ? "大きな願いは大報酬の共有owner接続後に利用できます。イベントは消費していません。"
      : "泉へ手を伸ばす結果の一部が大報酬の共有owner待ちです。イベントは消費していません。";
    return { runtime, result:"shared_large_reward_pending", completed:false, operations:[], notice:state.notice, persistenceRequested:false };
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
