import { resolveRewardTransaction } from "./bag-economy-reward-transaction.js";
import { resolveBerryJuiceShop } from "./mapless-berry-juice-shop-flow.js";
import {
  MAPLESS_V108_BERRY_IDS,
  MAPLESS_V108_RARE_BERRY_IDS,
  canonicalBerryEntriesFromBagSlots,
} from "./mapless-v108-berry-catalog.js";
import { borrowSafariSharedRunRandomInt } from "./safari-encounter-randomization.js";

const MAX_SLOTS = 20;
const MAX_PER_SLOT = 99;
const BASIC_REWARDS = Object.freeze(["FRESHWATER","SODAPOP","LEMONADE","MOOMOOMILK","POTION","SUPERPOTION"]);
const UPPER_REWARDS = Object.freeze(["LEMONADE","MOOMOOMILK","HYPERPOTION","MAXPOTION"]);
const RARE_REWARDS = Object.freeze(["MAXPOTION","FULLRESTORE","HPUP","PROTEIN","IRON","CALCIUM","ZINC","CARBOS"]);
const STATUS_BERRIES = new Set(["CHERIBERRY","CHESTOBERRY","PECHABERRY","RAWSTBERRY","ASPEARBERRY","PERSIMBERRY","LUMBERRY"]);
const ITEM_META = Object.freeze(Object.fromEntries(
  [...new Set([...MAPLESS_V108_BERRY_IDS, ...BASIC_REWARDS, ...UPPER_REWARDS, ...RARE_REWARDS, "FULLHEAL"])]
    .map((id) => [id, Object.freeze({ valid:true, pocket:"general" })]),
));

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}
function eventAt(runtime, index) {
  const event = stateOf(runtime).board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "berry_juice_shop") throw new Error("berry_juice_shop board event is required");
  return event;
}
function slotsOf(runtime) { return runtime?.bag?.slots ?? []; }
function pockets(runtime) {
  return { general:{ slots:slotsOf(runtime), maxSlots:MAX_SLOTS, maxPerSlot:MAX_PER_SLOT } };
}
function berryEntries(runtime) { return canonicalBerryEntriesFromBagSlots(slotsOf(runtime)); }
function total(entries) { return entries.reduce((sum, entry) => sum + entry[1], 0); }
function statusEntries(entries) { return entries.filter(([id]) => STATUS_BERRIES.has(id)); }
function rareEntries(entries) {
  const rare = new Set(MAPLESS_V108_RARE_BERRY_IDS);
  return entries.filter(([id]) => rare.has(id));
}
function sample(runtime, pool) {
  if (!pool.length) return null;
  return pool[borrowSafariSharedRunRandomInt(runtime, pool.length)];
}
function costsFromEntries(entries, quantity) {
  let remaining = Math.max(0, Math.trunc(Number(quantity) || 0));
  const costs = [];
  for (const [item, available] of entries) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, available);
    if (take > 0) costs.push({ item, quantity:take });
    remaining -= take;
  }
  return remaining === 0 ? costs : null;
}
function subtractOne(entries, item) {
  let removed = false;
  return entries.flatMap(([id, quantity]) => {
    if (!removed && id === item) {
      removed = true;
      return quantity > 1 ? [[id, quantity - 1]] : [];
    }
    return [[id, quantity]];
  });
}
function rewardPreflight(runtime, items) {
  return resolveRewardTransaction({ pockets:pockets(runtime), itemMeta:ITEM_META, items });
}
function transact(runtime, costs, items) {
  return resolveRewardTransaction({ pockets:pockets(runtime), itemMeta:ITEM_META, costs, items });
}
function applyTransaction(runtime, transaction) {
  if (!transaction?.success) return false;
  runtime.bag ??= { slots:[], money:0 };
  runtime.bag.slots = transaction.pockets.general.slots.filter(Boolean);
  return true;
}
function commit(runtime, index, owner, transaction = null) {
  const state = stateOf(runtime);
  state.board_events[index] = owner.event;
  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  state.board_consumed[index] = Boolean(owner.event.normal_resolved);
  state.last_operations = [
    ...(owner.operations ?? []).map((operation) => structuredClone(operation)),
    ...(transaction?.operations ?? []).map((operation) => structuredClone(operation)),
    { op:"request_save", reason:"berry_juice_shop_progress" },
  ];
  return state;
}
function stopped(runtime, index, owner, notice) {
  const state = stateOf(runtime);
  state.board_events[index] = owner.event;
  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  state.notice = notice;
  return { runtime, result:owner.outcome, completed:false, operations:owner.operations ?? [], notice, persistenceRequested:false, owner };
}
function successful(runtime, index, owner, transaction, notice) {
  if (!applyTransaction(runtime, transaction)) throw new Error("berry_juice_shop transaction failed after preflight");
  const state = commit(runtime, index, owner, transaction);
  state.notice = notice;
  return {
    runtime,
    result:owner.outcome,
    completed:Boolean(owner.event.normal_resolved),
    operations:state.last_operations,
    notice,
    persistenceRequested:true,
    owner,
    transaction,
  };
}
function ownerFor(event, choice, fields = {}) {
  return resolveBerryJuiceShop({ event, attempts:[{ choice, ...fields }] });
}

export function safariBerryJuiceShopActions(runtime, index) {
  const event = eventAt(runtime, index);
  const entries = berryEntries(runtime);
  const berries = total(entries);
  const status = total(statusEntries(entries));
  const rare = total(rareEntries(entries));
  const uses = Math.max(0, Math.trunc(Number(event.normal_data?.uses) || 0));
  const remaining = Math.max(0, 3 - uses);
  return [
    { id:"basic", label:"基本ジュース", meta:`きのみ3個 · 2個の回復道具 / 残り${remaining}回`, disabled:berries < 3 || remaining <= 0 },
    { id:"upper", label:"上級ジュース", meta:`きのみ5個 · 上級回復道具 / 残り${remaining}回`, disabled:berries < 5 || remaining <= 0 },
    { id:"status", label:"状態回復ジュース", meta:`対応きのみ3個（所持${status}個）· なんでもなおし`, disabled:status < 3 || remaining <= 0 },
    { id:"rare", label:"レアジュース", meta:`レアきのみ1個＋きのみ2個（レア所持${rare}個）`, disabled:rare < 1 || berries < 3 || remaining <= 0 },
    { id:"leave", label:uses > 0 ? "ここで店を離れる" : "利用せず立ち去る", secondary:true },
  ];
}

export function safariBerryJuiceShopMessage(runtime, index) {
  const event = eventAt(runtime, index);
  const uses = Math.max(0, Math.trunc(Number(event.normal_data?.uses) || 0));
  return `きのみジュース屋です。あと${Math.max(0, 3 - uses)}回作れます。成功したレシピだけ回数を消費します。`;
}

export function resolveSafariBerryJuiceShopInteraction(runtime, index, requestedAction) {
  const state = stateOf(runtime);
  const event = eventAt(runtime, index);
  if (state.battle && !state.battle.completed) return { runtime, result:"battle_active", completed:false, operations:[] };
  if (state.shop) return { runtime, result:"shop_active", completed:false, operations:[] };
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", completed:true, operations:[] };
  state.board_revealed[index] = true;
  state.board_visited[index] = true;

  const action = String(requestedAction ?? "");
  if (!["basic","upper","status","rare","leave"].includes(action)) {
    return { runtime, result:"unsupported_action", completed:false, availableActions:["basic","upper","status","rare","leave"], operations:[], persistenceRequested:false };
  }
  if (action === "leave") {
    const owner = ownerFor(event, "leave");
    const committed = commit(runtime, index, owner);
    committed.notice = "きのみジュース屋を離れました。";
    return { runtime, result:owner.outcome, completed:true, operations:committed.last_operations, notice:committed.notice, persistenceRequested:true, owner };
  }

  const entries = berryEntries(runtime);
  const berries = total(entries);
  let owner;
  let rewardItems;
  let costs;
  let extra = {};

  if (action === "basic") {
    if (berries < 3) return stopped(runtime, index, ownerFor(event, action, { berry_total:berries }), "きのみが3個必要です。");
    rewardItems = [sample(runtime, BASIC_REWARDS), sample(runtime, BASIC_REWARDS)];
    costs = costsFromEntries(entries, 3);
    extra = { berry_total:berries, rewards:rewardItems };
  } else if (action === "upper") {
    if (berries < 5) return stopped(runtime, index, ownerFor(event, action, { berry_total:berries }), "きのみが5個必要です。");
    rewardItems = [sample(runtime, UPPER_REWARDS)];
    costs = costsFromEntries(entries, 5);
    extra = { berry_total:berries, reward:rewardItems[0] };
  } else if (action === "status") {
    const eligible = statusEntries(entries);
    const eligibleTotal = total(eligible);
    if (eligibleTotal < 3) return stopped(runtime, index, ownerFor(event, action, { status_berry_total:eligibleTotal }), "状態回復用のきのみが3個必要です。");
    rewardItems = ["FULLHEAL"];
    costs = costsFromEntries(eligible, 3);
    extra = { status_berry_total:eligibleTotal, fullheal_exists:true, remove_status_result:true };
  } else {
    const rare = rareEntries(entries);
    const rareTotal = total(rare);
    if (rareTotal < 1 || berries < 3) return stopped(runtime, index, ownerFor(event, action, { rare_berry_total:rareTotal, berry_total:berries }), "レアきのみ1個を含む、合計3個のきのみが必要です。");
    const reward = sample(runtime, RARE_REWARDS);
    const rareId = sample(runtime, rare.map(([id]) => id));
    rewardItems = [reward];
    const remainingEntries = subtractOne(entries, rareId);
    const otherCosts = costsFromEntries(remainingEntries, 2);
    costs = [{ item:rareId, quantity:1 }, ...(otherCosts ?? [])];
    extra = { rare_berry_total:rareTotal, berry_total:berries, reward, rare_id:rareId, remove_rare_result:true };
  }

  const preflight = rewardPreflight(runtime, rewardItems);
  if (!preflight.success) {
    owner = ownerFor(event, action, { ...extra, can_add_result:false });
    return stopped(runtime, index, owner, "バッグに報酬を受け取る空きがありません。きのみは消費していません。");
  }
  const transaction = transact(runtime, costs, rewardItems);
  owner = ownerFor(event, action, {
    ...extra,
    can_add_result:true,
    consume_result:transaction.success,
    grant_result:transaction.success,
    remove_status_result:transaction.success,
    remove_rare_result:transaction.success,
  });
  if (!transaction.success) return stopped(runtime, index, owner, "ジュース作成を完了できませんでした。きのみとバッグは変更していません。");

  const uses = Number(owner.event.normal_data?.uses || 0);
  const rewardText = rewardItems.join("・");
  const suffix = owner.event.normal_resolved ? " 3回作ったので店を離れます。" : ` あと${Math.max(0, 3 - uses)}回作れます。`;
  return successful(runtime, index, owner, transaction, `${rewardText}を受け取りました。${suffix}`);
}
