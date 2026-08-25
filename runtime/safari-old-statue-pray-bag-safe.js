import {
  resolveSafariOldStatueInteraction as resolveBaseOldStatueInteraction,
  safariOldStatuePresentation as baseOldStatuePresentation,
} from "./safari-old-statue-break-safe.js";
import { resolveOldStatue } from "./mapless-old-statue-flow.js";
import {
  MAPLESS_OLD_STATUE_TREASURE_ITEMS_V108,
  resolveMaplessOldStatueOutcomeV108,
  selectMaplessOldStatueLostLowItemV108,
  selectMaplessOldStatueTreasureV108,
} from "./mapless-old-statue-v108-inputs.js";
import { MAPLESS_NORMAL_EVENT_SMALL_REWARD_ITEMS } from "./mapless-normal-event-small-reward.js";
import { resolveRewardTransaction } from "./bag-economy-reward-transaction.js";
import { borrowSafariSharedRunRandomInt, ensureSafariEncounterSeed } from "./safari-encounter-randomization.js";

const SAFARI_BAG_MAX_SLOTS = 20;
const SAFARI_BAG_MAX_PER_SLOT = 99;
const TREASURE_ITEM_META = Object.freeze(Object.fromEntries(
  MAPLESS_OLD_STATUE_TREASURE_ITEMS_V108.map((id) => [id, Object.freeze({ valid:true, pocket:"general" })]),
));
const LOW_ITEM_META = Object.freeze(Object.fromEntries(
  MAPLESS_NORMAL_EVENT_SMALL_REWARD_ITEMS.map((id) => [id, Object.freeze({ valid:true, pocket:"general" })]),
));

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}
function eventAt(runtime, index) {
  const event = stateOf(runtime).board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "old_statue") throw new Error("old_statue board event is required");
  return event;
}
function pockets(runtime) {
  return { general:{ slots:runtime?.bag?.slots ?? [], maxSlots:SAFARI_BAG_MAX_SLOTS, maxPerSlot:SAFARI_BAG_MAX_PER_SLOT } };
}
function quantity(runtime, itemId) {
  return (runtime?.bag?.slots ?? []).reduce((sum, slot) => {
    if (!Array.isArray(slot) || String(slot[0]) !== itemId) return sum;
    const count = Number(slot[1]);
    return sum + (Number.isInteger(count) && count > 0 ? count : 0);
  }, 0);
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
function commit(runtime, index, owner, applied = []) {
  const state = stateOf(runtime);
  state.board_events[index] = owner.event;
  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  state.board_consumed[index] = Boolean(owner.event.normal_resolved);
  state.last_operations = [
    ...(owner.operations ?? []).map((operation) => structuredClone(operation)),
    ...applied,
    { op:"request_save", reason:"old_statue_resolved" },
  ];
  return state;
}
function pending(runtime, result, notice) {
  const state = stateOf(runtime);
  state.notice = notice;
  return { runtime, result, completed:false, operations:[], notice, persistenceRequested:false };
}
function prayOutcome(event) {
  return resolveMaplessOldStatueOutcomeV108({
    normalSeed:Number(event.normal_seed),
    roll:Number(event.normal_data?.pray_roll ?? 0),
    goodLimit:50,
    neutralLimit:80,
  });
}
function beginSharedDraw(runtime) {
  const state = stateOf(runtime);
  ensureSafariEncounterSeed(state);
  return Number(state.preview_encounter_counter ?? 0);
}
function rollbackSharedDraw(runtime, counter) {
  stateOf(runtime).preview_encounter_counter = counter;
}
function sharedTreasure(runtime) {
  const counter = beginSharedDraw(runtime);
  const selected = selectMaplessOldStatueTreasureV108(
    MAPLESS_OLD_STATUE_TREASURE_ITEMS_V108,
    (max) => borrowSafariSharedRunRandomInt(runtime, max),
  );
  if (!selected?.value) {
    rollbackSharedDraw(runtime, counter);
    return { success:false, result:"empty_pool", operations:[] };
  }
  const transaction = resolveRewardTransaction({
    pockets:pockets(runtime),
    itemMeta:TREASURE_ITEM_META,
    items:[selected.value],
  });
  if (!transaction.success) rollbackSharedDraw(runtime, counter);
  return {
    ...transaction,
    selectedItem:selected.value,
    operations:[{ op:"select_old_statue_treasure", item:selected.value, index:selected.index }, ...(transaction.operations ?? [])],
  };
}
function sharedLostLowItem(runtime) {
  const owned = MAPLESS_NORMAL_EVENT_SMALL_REWARD_ITEMS.filter((itemId) => quantity(runtime, itemId) > 0);
  if (owned.length === 0) return { success:true, noItem:true, selectedItem:null, operations:[] };
  const counter = beginSharedDraw(runtime);
  const selected = selectMaplessOldStatueLostLowItemV108(
    owned,
    (max) => borrowSafariSharedRunRandomInt(runtime, max),
  );
  if (!selected?.value) {
    rollbackSharedDraw(runtime, counter);
    return { success:false, result:"selection_failed", operations:[] };
  }
  const transaction = resolveRewardTransaction({
    pockets:pockets(runtime),
    itemMeta:LOW_ITEM_META,
    costs:[{ item:selected.value, quantity:1 }],
  });
  if (!transaction.success) rollbackSharedDraw(runtime, counter);
  return {
    ...transaction,
    selectedItem:selected.value,
    operations:[{ op:"select_old_statue_lost_low_item", item:selected.value, index:selected.index }, ...(transaction.operations ?? [])],
  };
}

export function safariOldStatuePresentation(runtime, index) {
  const presentation = baseOldStatuePresentation(runtime, index);
  return {
    ...presentation,
    actions:presentation.actions.map((action) => action.id === "pray"
      ? { ...action, meta:"回復・道具・お金・災いに加え、宝物とLOW_ITEM喪失まで接続済み" }
      : action),
  };
}

export async function resolveSafariOldStatueInteraction(runtime, index, requestedAction) {
  const action = String(requestedAction ?? "");
  if (action !== "pray") return await resolveBaseOldStatueInteraction(runtime, index, action);

  const state = stateOf(runtime);
  const event = eventAt(runtime, index);
  if (state.battle && !state.battle.completed) return { runtime, result:"battle_active", completed:false, operations:[] };
  if (state.shop) return { runtime, result:"shop_active", completed:false, operations:[] };
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", completed:true, operations:[] };
  state.board_revealed[index] = true;
  state.board_visited[index] = true;

  const resolved = prayOutcome(event);
  const outcome = { effect_index:resolved.effectIndex, status:resolved.status };

  if (resolved.branch === "good" && resolved.effectIndex === 3) {
    const reward = sharedTreasure(runtime);
    if (!reward.success) return pending(runtime, "reward_bag_full", "石像の宝物を受け取るバッグの空きがありません。イベントと共有RNGは消費していません。");
    const owner = resolveOldStatue({ event, choice:"pray", outcome, grant_result:true });
    const applied = [...(reward.operations ?? []).map((operation) => structuredClone(operation)), ...applyTransaction(runtime, reward)];
    commit(runtime, index, owner, applied);
    state.notice = `石像から${reward.selectedItem}を授かりました。`;
    return { runtime, result:owner.outcome, completed:true, reward, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
  }

  if (resolved.branch === "bad" && resolved.effectIndex === 2) {
    const loss = sharedLostLowItem(runtime);
    if (!loss.success) return pending(runtime, "old_statue_low_item_loss_failed", "石像の災いをBagへ反映できませんでした。イベントと共有RNGは消費していません。");
    const owner = resolveOldStatue({ event, choice:"pray", outcome, low_item:loss.selectedItem });
    const applied = [...(loss.operations ?? []).map((operation) => structuredClone(operation)), ...applyTransaction(runtime, loss)];
    commit(runtime, index, owner, applied);
    state.notice = loss.noItem
      ? "不吉な風が吹きましたが、失うような道具は持っていませんでした。"
      : `不吉な風に${loss.selectedItem}を1個失いました。`;
    return { runtime, result:owner.outcome, completed:true, loss, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
  }

  return await resolveBaseOldStatueInteraction(runtime, index, action);
}
