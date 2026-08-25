import { resolveRewardTransaction } from "./bag-economy-reward-transaction.js";
import {
  itemCollectorOwnedEntriesV108,
  resolveCanonicalItemCollectorV108,
} from "./mapless-item-collector-v108.js";

const SAFARI_BAG_MAX_SLOTS = 20;
const SAFARI_BAG_MAX_PER_SLOT = 99;

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}
function eventAt(runtime, index) {
  const event = stateOf(runtime).board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "item_collector") throw new Error("item_collector board event is required");
  return event;
}
function quantityOf(runtime, itemId) {
  return (runtime?.bag?.slots ?? []).reduce((sum, slot) => {
    if (!Array.isArray(slot) || String(slot[0]) !== String(itemId)) return sum;
    const quantity = Number(slot[1]);
    return sum + (Number.isInteger(quantity) && quantity > 0 ? quantity : 0);
  }, 0);
}
function itemExists() { return true; }
function pockets(runtime) {
  return { general:{ slots:runtime?.bag?.slots ?? [], maxSlots:SAFARI_BAG_MAX_SLOTS, maxPerSlot:SAFARI_BAG_MAX_PER_SLOT } };
}
function metaFor(ids) {
  return Object.fromEntries([...new Set(ids)].map((id) => [id, { valid:true, pocket:"general" }]));
}
function applyTransaction(runtime, transaction) {
  if (!transaction?.success) return [];
  runtime.bag ??= { slots:[], money:0 };
  runtime.bag.slots = transaction.pockets.general.slots.filter(Boolean);
  return [
    ...(transaction.consumed ?? []).map((entry) => ({ op:"runtime_remove_item", item:entry.item, quantity:entry.quantity })),
    ...(transaction.granted ?? []).map((entry) => ({ op:"runtime_grant_item", item:entry.item, quantity:entry.quantity })),
  ];
}
function commit(runtime, index, owner, extraOperations = []) {
  const state = stateOf(runtime);
  state.board_events[index] = owner.event;
  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  state.board_consumed[index] = Boolean(owner.event.normal_resolved);
  state.last_operations = [
    ...(owner.operations ?? []).map((operation) => structuredClone(operation)),
    ...extraOperations,
    { op:"request_save", reason:"item_collector_resolved" },
  ];
  return state;
}
function categoryLabel(category) { return category === "ball" ? "ボール" : "回復道具"; }

export function safariItemCollectorOwnedEntries(runtime, index, category) {
  eventAt(runtime, index);
  if (!["ball", "medicine"].includes(category)) return [];
  return itemCollectorOwnedEntriesV108(category, itemExists, (id) => quantityOf(runtime, id));
}

export function safariItemCollectorPresentation(runtime, index, category = null) {
  eventAt(runtime, index);
  if (!["ball", "medicine"].includes(category)) {
    return {
      title:"アイテム収集家",
      message:"珍しい道具を集めている人がいます。交換したい種類を選んでください。",
      actions:[
        { id:"category:ball", label:"ボールを交換する" },
        { id:"category:medicine", label:"回復道具を交換する" },
        { id:"leave", label:"立ち去る", secondary:true },
      ],
    };
  }
  const entries = safariItemCollectorOwnedEntries(runtime, index, category);
  return {
    title:"アイテム収集家",
    message:entries.length
      ? `${categoryLabel(category)}から交換する道具を選んでください。`
      : `交換できる${categoryLabel(category)}を持っていません。`,
    actions:[
      ...entries.map((entry) => ({
        id:`exchange:${category}:${entry.id}`,
        label:`${entry.id} ×${entry.qty}`,
        meta:`グレード ${entry.grade + 1}`,
      })),
      { id:"back", label:"種類選択へ戻る", secondary:true },
      { id:"leave", label:"立ち去る", secondary:true },
    ],
  };
}

export function resolveSafariItemCollectorInteraction(runtime, index, requestedAction) {
  const state = stateOf(runtime);
  const event = eventAt(runtime, index);
  if (state.battle && !state.battle.completed) return { runtime, result:"battle_active", completed:false, operations:[] };
  if (state.shop) return { runtime, result:"shop_active", completed:false, operations:[] };
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", completed:true, operations:[] };
  state.board_revealed[index] = true;
  state.board_visited[index] = true;

  const raw = String(requestedAction ?? "");
  if (raw === "leave") {
    const owner = resolveCanonicalItemCollectorV108({ event, choice:"leave" });
    commit(runtime, index, owner);
    state.notice = "アイテム収集家と別れました。";
    return { runtime, result:owner.outcome, completed:true, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
  }

  const match = /^exchange:(ball|medicine):(.+)$/.exec(raw);
  if (!match) return { runtime, result:"unsupported_action", completed:false, operations:[], persistenceRequested:false };
  const [, category, selectedItem] = match;
  if (quantityOf(runtime, selectedItem) <= 0) {
    state.notice = "その道具はもう持っていません。";
    return { runtime, result:"selected_item_unavailable", completed:false, operations:[], notice:state.notice, persistenceRequested:false };
  }

  const common = {
    event,
    choice:category,
    selected_item:selectedItem,
    item_exists:itemExists,
    quantity_of:(id) => quantityOf(runtime, id),
  };
  const preview = resolveCanonicalItemCollectorV108({ ...common, can_add_result:true, remove_item_result:true, grant_item_result:true });
  const rewardOperation = (preview.operations ?? []).find((operation) => operation?.op === "select_reward");
  if (!rewardOperation?.item) {
    state.notice = "交換できる別の道具がありません。";
    return { runtime, result:preview.outcome, completed:false, operations:preview.operations ?? [], notice:state.notice, persistenceRequested:false, owner:preview };
  }
  const rewardItem = String(rewardOperation.item);
  const itemMeta = metaFor([selectedItem, rewardItem]);

  // Canonical Item Collector checks reward capacity before removing the offered item.
  // Do an items-only preflight first; only then use the existing atomic cost+grant owner.
  const capacity = resolveRewardTransaction({ pockets:pockets(runtime), itemMeta, items:[rewardItem] });
  if (!capacity.success) {
    const owner = resolveCanonicalItemCollectorV108({ ...common, can_add_result:false, remove_item_result:true, grant_item_result:true });
    state.notice = "交換品を受け取るバッグの空きがありません。";
    return { runtime, result:owner.outcome, completed:false, operations:[...(owner.operations ?? []), ...(capacity.operations ?? [])], notice:state.notice, persistenceRequested:false, owner };
  }

  const transaction = resolveRewardTransaction({
    pockets:pockets(runtime),
    itemMeta,
    items:[rewardItem],
    costs:[{ item:selectedItem, quantity:1 }],
  });
  if (!transaction.success) {
    state.notice = "交換を完了できませんでした。道具は消費していません。";
    return { runtime, result:transaction.result, completed:false, operations:transaction.operations ?? [], notice:state.notice, persistenceRequested:false };
  }

  const owner = resolveCanonicalItemCollectorV108({ ...common, can_add_result:true, remove_item_result:true, grant_item_result:true });
  const applied = applyTransaction(runtime, transaction);
  commit(runtime, index, owner, [
    ...(transaction.operations ?? []).map((operation) => structuredClone(operation)),
    ...applied,
  ]);
  state.notice = `${selectedItem}を渡し、${rewardItem}を受け取りました。`;
  return { runtime, result:owner.outcome, completed:true, rewardItem, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner, transaction };
}
