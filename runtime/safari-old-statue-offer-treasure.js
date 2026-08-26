import {
  resolveSafariOldStatueInteraction as resolveBaseOldStatueInteraction,
  safariOldStatueBonusCandidates,
  safariOldStatueOfferEntries,
  safariOldStatuePrayNeedsPokemon,
  safariOldStatuePresentation as baseOldStatuePresentation,
} from "./safari-old-statue-offer-medium-reward.js";
import { resolveOldStatue } from "./mapless-old-statue-flow.js";
import {
  MAPLESS_OLD_STATUE_TREASURE_ITEMS_V108,
  resolveMaplessOldStatueOutcomeV108,
  selectMaplessOldStatueTreasureV108,
} from "./mapless-old-statue-v108-inputs.js";
import { resolveRewardTransaction } from "./bag-economy-reward-transaction.js";
import { borrowSafariSharedRunRandomInt, ensureSafariEncounterSeed } from "./safari-encounter-randomization.js";

const SAFARI_BAG_MAX_SLOTS = 20;
const SAFARI_BAG_MAX_PER_SLOT = 99;
const TREASURE_META = Object.freeze(Object.fromEntries(
  MAPLESS_OLD_STATUE_TREASURE_ITEMS_V108.map((id) => [id, Object.freeze({ valid:true, pocket:"general" })]),
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
function quantityOf(runtime, itemId) {
  return (runtime?.bag?.slots ?? []).reduce((sum, slot) => {
    if (!Array.isArray(slot) || String(slot[0]) !== String(itemId)) return sum;
    const quantity = Number(slot[1]);
    return sum + (Number.isInteger(quantity) && quantity > 0 ? quantity : 0);
  }, 0);
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
function pockets(runtime) {
  return { general:{ slots:runtime?.bag?.slots ?? [], maxSlots:SAFARI_BAG_MAX_SLOTS, maxPerSlot:SAFARI_BAG_MAX_PER_SLOT } };
}
function itemMeta(offeredItem) {
  return { ...TREASURE_META, [offeredItem]:{ valid:true, pocket:"general" } };
}
function commit(runtime, index, owner, transaction, selectedItem, selectedIndex) {
  const state = stateOf(runtime);
  runtime.bag ??= { slots:[], money:0 };
  runtime.bag.slots = transaction.pockets.general.slots.filter(Boolean);
  state.board_events[index] = owner.event;
  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  state.board_consumed[index] = Boolean(owner.event.normal_resolved);
  state.last_operations = [
    ...(owner.operations ?? []).map((operation) => structuredClone(operation)),
    { op:"select_old_statue_treasure", item:selectedItem, index:selectedIndex },
    ...(transaction.operations ?? []).map((operation) => structuredClone(operation)),
    ...(transaction.consumed ?? []).map((entry) => ({ op:"runtime_remove_item", item:entry.item, quantity:entry.quantity })),
    ...(transaction.granted ?? []).map((entry) => ({ op:"runtime_grant_item", item:entry.item, quantity:entry.quantity })),
    { op:"request_save", reason:"old_statue_resolved" },
  ];
  state.notice = `${selectedItem}を授かりました。`;
  return state;
}

export { safariOldStatueBonusCandidates, safariOldStatueOfferEntries, safariOldStatuePrayNeedsPokemon };

export function safariOldStatuePresentation(runtime, index) {
  const presentation = baseOldStatuePresentation(runtime, index);
  return {
    ...presentation,
    actions:presentation.actions.map((action) => action.id === "offer"
      ? { ...action, meta:"所持道具を1個供えます。中くらいの報酬・宝物・盤面開示・一戦の力など接続済み結果はその場で完了します" }
      : action),
  };
}

export async function resolveSafariOldStatueInteraction(runtime, index, requestedAction, options = {}) {
  const action = String(requestedAction ?? "");
  if (action !== "offer") return await resolveBaseOldStatueInteraction(runtime, index, action, options);

  const state = stateOf(runtime);
  const event = eventAt(runtime, index);
  if (state.battle && !state.battle.completed) return { runtime, result:"battle_active", completed:false, operations:[] };
  if (state.shop) return { runtime, result:"shop_active", completed:false, operations:[] };
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", completed:true, operations:[] };

  const resolved = offerOutcome(event);
  if (!(resolved.branch === "good" && resolved.effectIndex === 3)) {
    return await resolveBaseOldStatueInteraction(runtime, index, action, options);
  }

  const offeredItem = String(options?.offeredItem ?? "");
  if (!offeredItem) return pending(runtime, "old_statue_offer_cancelled", "供える道具を選びませんでした。道具もイベントも消費していません。");
  if (quantityOf(runtime, offeredItem) <= 0) return pending(runtime, "old_statue_offer_item_unavailable", "その道具はもう持っていません。道具もイベントも消費していません。");

  ensureSafariEncounterSeed(state);
  const counter = Number(state.preview_encounter_counter ?? 0);
  const selected = selectMaplessOldStatueTreasureV108(
    MAPLESS_OLD_STATUE_TREASURE_ITEMS_V108,
    (max) => borrowSafariSharedRunRandomInt(runtime, max),
  );
  if (!selected?.value) {
    state.preview_encounter_counter = counter;
    return pending(runtime, "old_statue_offer_treasure_selection_failed", "石像の宝物を確定できませんでした。道具・イベント・共有RNGは消費していません。");
  }

  const transaction = resolveRewardTransaction({
    pockets:pockets(runtime),
    itemMeta:itemMeta(offeredItem),
    costs:[{ item:offeredItem, quantity:1 }],
    items:[selected.value],
  });
  if (!transaction.success) {
    state.preview_encounter_counter = counter;
    return pending(runtime, "old_statue_offer_treasure_bag_full", "供物と宝物を安全に確定できませんでした。道具・イベント・共有RNGは消費していません。");
  }

  const owner = resolveOldStatue({
    event,
    choice:"offer",
    offered_item:offeredItem,
    remove_result:true,
    outcome:{ effect_index:resolved.effectIndex, status:resolved.status },
    grant_result:true,
  });
  commit(runtime, index, owner, transaction, selected.value, selected.index);
  return {
    runtime,
    result:owner.outcome,
    completed:true,
    offeredItem,
    treasure:selected.value,
    operations:state.last_operations,
    notice:state.notice,
    persistenceRequested:true,
    owner,
    transaction,
  };
}
