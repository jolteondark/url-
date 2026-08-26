import {
  resolveSafariOldStatueInteraction as resolveBaseOldStatueInteraction,
  safariOldStatueBonusCandidates,
  safariOldStatueOfferEntries,
  safariOldStatuePrayNeedsPokemon,
  safariOldStatuePresentation as baseOldStatuePresentation,
} from "./safari-old-statue-offer-eligibility.js?v=20260826-1810";
import { resolveOldStatue } from "./mapless-old-statue-flow.js";
import {
  resolveMaplessOldStatueOutcomeV108,
  selectMaplessOldStatueLostLowItemV108,
} from "./mapless-old-statue-v108-inputs.js";
import { MAPLESS_NORMAL_EVENT_SMALL_REWARD_ITEMS } from "./mapless-normal-event-small-reward.js";
import { resolveRewardTransaction } from "./bag-economy-reward-transaction.js";
import { borrowSafariSharedRunRandomInt, ensureSafariEncounterSeed } from "./safari-encounter-randomization.js";

const SAFARI_BAG_MAX_SLOTS = 20;
const SAFARI_BAG_MAX_PER_SLOT = 99;

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
function quantity(runtime, itemId) {
  return (runtime?.bag?.slots ?? []).reduce((sum, slot) => {
    if (!Array.isArray(slot) || String(slot[0]) !== String(itemId)) return sum;
    const count = Number(slot[1]);
    return sum + (Number.isInteger(count) && count > 0 ? count : 0);
  }, 0);
}
function pockets(runtime) {
  return { general:{ slots:runtime?.bag?.slots ?? [], maxSlots:SAFARI_BAG_MAX_SLOTS, maxPerSlot:SAFARI_BAG_MAX_PER_SLOT } };
}
function itemMeta(itemIds) {
  return Object.fromEntries([...new Set(itemIds.map(String))].map((id) => [id, { valid:true, pocket:"general" }]));
}
function offerOutcome(event) {
  return resolveMaplessOldStatueOutcomeV108({
    normalSeed:Number(event.normal_seed),
    roll:Number(event.normal_data?.offer_roll ?? 0),
    goodLimit:75,
    neutralLimit:95,
  });
}
function pending(runtime, result, notice) {
  const state = stateOf(runtime);
  state.notice = notice;
  return { runtime, result, completed:false, operations:[], notice, persistenceRequested:false };
}
function beginSharedDraw(runtime) {
  const state = stateOf(runtime);
  ensureSafariEncounterSeed(state);
  return Number(state.preview_encounter_counter ?? 0);
}
function rollbackSharedDraw(runtime, counter) {
  stateOf(runtime).preview_encounter_counter = counter;
}
function applyTransaction(runtime, transaction) {
  runtime.bag ??= { slots:[], money:0 };
  runtime.bag.slots = transaction.pockets.general.slots.filter(Boolean);
  return (transaction.consumed ?? []).map((entry) => ({ op:"runtime_remove_item", item:entry.item, quantity:entry.quantity }));
}
function commit(runtime, index, owner, applied) {
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
function combinedCosts(offeredItem, selectedLowItem) {
  if (!selectedLowItem) return [{ item:offeredItem, quantity:1 }];
  if (String(selectedLowItem) === String(offeredItem)) return [{ item:offeredItem, quantity:2 }];
  return [{ item:offeredItem, quantity:1 }, { item:selectedLowItem, quantity:1 }];
}

export { safariOldStatueBonusCandidates, safariOldStatueOfferEntries, safariOldStatuePrayNeedsPokemon };

export function safariOldStatuePresentation(runtime, index) {
  const presentation = baseOldStatuePresentation(runtime, index);
  return {
    ...presentation,
    actions:presentation.actions.map((action) => action.id === "offer"
      ? { ...action, meta:"供物への反応はLOW_ITEM喪失まで接続済み" }
      : action),
  };
}

export async function resolveSafariOldStatueInteraction(runtime, index, requestedAction, options = {}) {
  const action = String(requestedAction ?? "");
  if (action !== "offer") return await resolveBaseOldStatueInteraction(runtime, index, action, options);

  const state = stateOf(runtime);
  const event = eventAt(runtime, index);
  const resolved = offerOutcome(event);
  if (!(resolved.branch === "bad" && resolved.effectIndex === 2)) {
    return await resolveBaseOldStatueInteraction(runtime, index, action, options);
  }
  if (state.battle && !state.battle.completed) return { runtime, result:"battle_active", completed:false, operations:[] };
  if (state.shop) return { runtime, result:"shop_active", completed:false, operations:[] };
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", completed:true, operations:[] };

  const offeredItem = String(options?.offeredItem ?? "");
  if (!offeredItem) return pending(runtime, "old_statue_offer_cancelled", "供える道具を選びませんでした。道具もイベントも消費していません。");
  const eligible = safariOldStatueOfferEntries(runtime, index).some((entry) => entry.id === offeredItem);
  if (!eligible) return pending(runtime, "old_statue_offer_item_ineligible", "その道具は石像への供物にできません。道具もイベントも消費していません。");

  const remainingLowItems = MAPLESS_NORMAL_EVENT_SMALL_REWARD_ITEMS.filter((itemId) => {
    const plannedOfferingCost = String(itemId) === offeredItem ? 1 : 0;
    return quantity(runtime, itemId) - plannedOfferingCost > 0;
  });

  let counter = null;
  let selectedLowItem = null;
  let selectedIndex = null;
  if (remainingLowItems.length > 0) {
    counter = beginSharedDraw(runtime);
    const selected = selectMaplessOldStatueLostLowItemV108(
      remainingLowItems,
      (max) => borrowSafariSharedRunRandomInt(runtime, max),
    );
    if (!selected?.value) {
      rollbackSharedDraw(runtime, counter);
      return pending(runtime, "old_statue_low_item_selection_failed", "石像の災いを安全に確定できませんでした。道具もイベントも共有RNGも消費していません。");
    }
    selectedLowItem = selected.value;
    selectedIndex = selected.index;
  }

  const costs = combinedCosts(offeredItem, selectedLowItem);
  const transaction = resolveRewardTransaction({
    pockets:pockets(runtime),
    itemMeta:itemMeta(costs.map((entry) => entry.item)),
    costs,
  });
  if (!transaction.success) {
    if (counter != null) rollbackSharedDraw(runtime, counter);
    return pending(runtime, "old_statue_offer_low_item_commit_failed", "供物と災いを安全に反映できませんでした。道具もイベントも共有RNGも消費していません。");
  }

  const owner = resolveOldStatue({
    event,
    choice:"offer",
    offered_item:offeredItem,
    remove_result:true,
    outcome:{ effect_index:resolved.effectIndex, status:resolved.status },
    low_item:selectedLowItem,
  });
  const applied = [
    ...(selectedLowItem ? [{ op:"select_old_statue_lost_low_item", item:selectedLowItem, index:selectedIndex }] : []),
    ...(transaction.operations ?? []).map((operation) => structuredClone(operation)),
    ...applyTransaction(runtime, transaction),
  ];
  commit(runtime, index, owner, applied);
  state.notice = selectedLowItem
    ? `${offeredItem}を供えると、不吉な風に${selectedLowItem}を1個失いました。`
    : `${offeredItem}を供えると不吉な風が吹きましたが、ほかに失うような道具はありませんでした。`;
  return {
    runtime,
    result:owner.outcome,
    completed:true,
    offeredItem,
    lostItem:selectedLowItem,
    transaction,
    owner,
    operations:state.last_operations,
    notice:state.notice,
    persistenceRequested:true,
  };
}
