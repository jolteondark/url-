import {
  resolveSafariOldStatueInteraction as resolveBaseOldStatueInteraction,
  safariOldStatueBonusCandidates,
  safariOldStatueOfferEntries,
  safariOldStatuePrayNeedsPokemon,
  safariOldStatuePresentation,
} from "./safari-old-statue-offer-simple.js";
import { resolveOldStatue } from "./mapless-old-statue-flow.js";
import { resolveMaplessOldStatueOutcomeV108 } from "./mapless-old-statue-v108-inputs.js";
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

function eligibleRevealIndices(state, currentIndex) {
  const events = Array.isArray(state.board_events) ? state.board_events : [];
  return events.flatMap((event, index) => {
    if (index === currentIndex || !event) return [];
    if (state.board_revealed?.[index] || state.board_consumed?.[index]) return [];
    return [index];
  });
}

function pockets(runtime) {
  return { general:{ slots:runtime?.bag?.slots ?? [], maxSlots:SAFARI_BAG_MAX_SLOTS, maxPerSlot:SAFARI_BAG_MAX_PER_SLOT } };
}

function applyOfferCost(runtime, offeredItem, transaction) {
  runtime.bag ??= { slots:[], money:0 };
  runtime.bag.slots = transaction.pockets.general.slots.filter(Boolean);
  return [
    ...(transaction.operations ?? []).map((operation) => structuredClone(operation)),
    ...(transaction.consumed ?? []).map((entry) => ({ op:"runtime_remove_item", item:entry.item, quantity:entry.quantity })),
  ];
}

function pending(runtime, result, notice) {
  const state = stateOf(runtime);
  state.notice = notice;
  return { runtime, result, completed:false, operations:[], notice, persistenceRequested:false };
}

function commit(runtime, index, revealIndex, owner, applied) {
  const state = stateOf(runtime);
  state.board_events[index] = owner.event;
  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  state.board_consumed[index] = Boolean(owner.event.normal_resolved);
  state.board_revealed[revealIndex] = true;
  state.last_operations = [
    ...(owner.operations ?? []).map((operation) => structuredClone(operation)),
    ...applied,
    { op:"runtime_reveal_board_cell", board_index:revealIndex, source:"old_statue_offer" },
    { op:"request_save", reason:"old_statue_resolved" },
  ];
  return state;
}

export { safariOldStatueBonusCandidates, safariOldStatueOfferEntries, safariOldStatuePrayNeedsPokemon, safariOldStatuePresentation };

export async function resolveSafariOldStatueInteraction(runtime, index, requestedAction, options = {}) {
  const action = String(requestedAction ?? "");
  if (action !== "offer") return await resolveBaseOldStatueInteraction(runtime, index, action, options);

  const state = stateOf(runtime);
  const event = eventAt(runtime, index);
  if (state.battle && !state.battle.completed) return { runtime, result:"battle_active", completed:false, operations:[] };
  if (state.shop) return { runtime, result:"shop_active", completed:false, operations:[] };
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", completed:true, operations:[] };

  const resolved = offerOutcome(event);
  if (!(resolved.branch === "good" && resolved.effectIndex === 4)) {
    return await resolveBaseOldStatueInteraction(runtime, index, action, options);
  }

  const offeredItem = String(options?.offeredItem ?? "");
  if (!offeredItem) return pending(runtime, "old_statue_offer_cancelled", "供える道具を選びませんでした。道具もイベントも消費していません。");
  if (quantityOf(runtime, offeredItem) <= 0) return pending(runtime, "old_statue_offer_item_unavailable", "その道具はもう持っていません。道具もイベントも消費していません。");

  const eligible = eligibleRevealIndices(state, index);
  if (!eligible.length) {
    return pending(runtime, "old_statue_offer_board_reveal_no_eligible_cell", "石像が示せる未開示のマスがありません。道具・イベント・共有RNGは消費していません。");
  }

  ensureSafariEncounterSeed(state);
  const counter = Number(state.preview_encounter_counter ?? 0);
  const selectedIndex = Number(borrowSafariSharedRunRandomInt(runtime, eligible.length));
  const revealIndex = eligible[selectedIndex];
  if (!Number.isInteger(revealIndex) || revealIndex === index || state.board_revealed?.[revealIndex] || state.board_consumed?.[revealIndex]) {
    state.preview_encounter_counter = counter;
    return pending(runtime, "old_statue_offer_board_reveal_commit_failed", "石像の示すマスを確定できませんでした。道具・イベント・共有RNGは消費していません。");
  }

  const transaction = resolveRewardTransaction({
    pockets:pockets(runtime),
    itemMeta:{ [offeredItem]:{ valid:true, pocket:"general" } },
    costs:[{ item:offeredItem, quantity:1 }],
  });
  if (!transaction.success) {
    state.preview_encounter_counter = counter;
    return pending(runtime, "old_statue_offer_remove_failed", "供物を安全に消費できませんでした。道具・イベント・共有RNGは消費していません。");
  }

  const owner = resolveOldStatue({
    event,
    choice:"offer",
    offered_item:offeredItem,
    remove_result:true,
    outcome:{ effect_index:resolved.effectIndex, status:resolved.status },
  });
  const applied = applyOfferCost(runtime, offeredItem, transaction);
  commit(runtime, index, revealIndex, owner, applied);
  state.notice = `${offeredItem}を供えると、石像の加護でDay Boardの${revealIndex + 1}番目のマスが明らかになりました。`;
  return {
    runtime,
    result:owner.outcome,
    completed:true,
    offeredItem,
    revealedBoardIndex:revealIndex,
    operations:state.last_operations,
    notice:state.notice,
    persistenceRequested:true,
    owner,
    transaction,
  };
}
