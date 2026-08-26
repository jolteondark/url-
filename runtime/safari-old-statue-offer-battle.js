import {
  resolveSafariOldStatueInteraction as resolveBaseOldStatueInteraction,
  safariOldStatueBonusCandidates,
  safariOldStatueOfferEntries,
  safariOldStatuePrayNeedsPokemon,
  safariOldStatuePresentation as baseOldStatuePresentation,
} from "./safari-old-statue-offer-treasure.js";
import { resolveOldStatue } from "./mapless-old-statue-flow.js";
import {
  resolveMaplessOldStatueOutcomeV108,
  selectMaplessOldStatueBattleTypeV108,
} from "./mapless-old-statue-v108-inputs.js";
import { maplessNormalEventScalingValue } from "./mapless-normal-event-medium-reward.js";
import { resolveRewardTransaction } from "./bag-economy-reward-transaction.js";
import { borrowSafariSharedRunRandomInt, ensureSafariEncounterSeed } from "./safari-encounter-randomization.js";
import { activateSafariNormalEventWildBattle } from "./safari-web-combat-start.js";

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
function offerOutcome(event) {
  return resolveMaplessOldStatueOutcomeV108({
    normalSeed:Number(event.normal_seed),
    roll:Number(event.normal_data?.offer_roll ?? 0),
    goodLimit:75,
    neutralLimit:95,
  });
}
function battleOperation(owner) {
  return (owner.operations ?? []).find((operation) => operation?.op === "start_wild_battle") ?? null;
}
function quantityOf(runtime, itemId) {
  return (runtime?.bag?.slots ?? []).reduce((sum, slot) => {
    if (!Array.isArray(slot) || String(slot[0]) !== String(itemId)) return sum;
    const quantity = Number(slot[1]);
    return sum + (Number.isInteger(quantity) && quantity > 0 ? quantity : 0);
  }, 0);
}
function pockets(runtime) {
  return { general:{ slots:runtime?.bag?.slots ?? [], maxSlots:SAFARI_BAG_MAX_SLOTS, maxPerSlot:SAFARI_BAG_MAX_PER_SLOT } };
}
function pending(runtime, result, notice) {
  const state = stateOf(runtime);
  state.notice = notice;
  return { runtime, result, completed:false, operations:[], notice, persistenceRequested:false };
}

export { safariOldStatueBonusCandidates, safariOldStatueOfferEntries, safariOldStatuePrayNeedsPokemon };

export function safariOldStatuePresentation(runtime, index) {
  const presentation = baseOldStatuePresentation(runtime, index);
  return {
    ...presentation,
    actions:presentation.actions.map((action) => action.id === "offer"
      ? { ...action, meta:"所持道具を1個供えます。回復・報酬・宝物・盤面開示・一戦の力・野生戦など接続済み結果はその場で完了します" }
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
  if (!(resolved.branch === "neutral" && resolved.effectIndex === 0)) {
    return await resolveBaseOldStatueInteraction(runtime, index, action, options);
  }

  const offeredItem = String(options?.offeredItem ?? "");
  if (!offeredItem) return pending(runtime, "old_statue_offer_cancelled", "供える道具を選びませんでした。道具もイベントも消費していません。");
  if (quantityOf(runtime, offeredItem) <= 0) return pending(runtime, "old_statue_offer_item_unavailable", "その道具はもう持っていません。道具もイベントも消費していません。");

  const transaction = resolveRewardTransaction({
    pockets:pockets(runtime),
    itemMeta:{ [offeredItem]:{ valid:true, pocket:"general" } },
    costs:[{ item:offeredItem, quantity:1 }],
    items:[],
  });
  if (!transaction.success) return pending(runtime, "old_statue_offer_remove_failed", "供物を安全に確定できませんでした。道具もイベントも消費していません。");

  ensureSafariEncounterSeed(state);
  const counter = Number(state.preview_encounter_counter ?? 0);
  const selected = selectMaplessOldStatueBattleTypeV108((max) => borrowSafariSharedRunRandomInt(runtime, max));
  if (!selected?.value) {
    state.preview_encounter_counter = counter;
    return pending(runtime, "old_statue_offer_battle_type_selection_failed", "石像の戦闘タイプ抽選に失敗しました。道具・イベント・共有RNGは消費していません。");
  }

  const preview = resolveOldStatue({
    event,
    choice:"offer",
    offered_item:offeredItem,
    remove_result:true,
    scaling_value:maplessNormalEventScalingValue(state.day),
    outcome:{ effect_index:resolved.effectIndex, status:resolved.status, type_id:selected.value },
  });
  const battleEvent = battleOperation(preview);
  if (!battleEvent) {
    state.preview_encounter_counter = counter;
    throw new Error("old_statue offer did not request Battle");
  }

  const started = await activateSafariNormalEventWildBattle(runtime, index, {
    eventId:"old_statue",
    actionId:"offer",
    battleEvent,
    request:structuredClone(battleEvent),
    payload:{ battle_type:selected.value, offered_item:offeredItem },
  });
  if (started.result !== "normal_event_wild_battle_started") {
    state.preview_encounter_counter = counter;
    return started;
  }

  runtime.bag ??= { slots:[], money:0 };
  runtime.bag.slots = transaction.pockets.general.slots.filter(Boolean);
  if (state.battle) globalThis.__maplessNormalEventUi = null;
  const operations = [
    { op:"select_old_statue_battle_type", type:selected.value, index:selected.index },
    ...(transaction.operations ?? []).map((operation) => structuredClone(operation)),
    ...(transaction.consumed ?? []).map((entry) => ({ op:"runtime_remove_item", item:entry.item, quantity:entry.quantity })),
    ...(started.operations ?? []),
    { op:"request_save", reason:"old_statue_offer_battle_started" },
  ];
  state.last_operations = operations;
  state.notice = `${offeredItem}を供えました。石像から現れたポケモンと戦います。`;
  return { ...started, operations, persistenceRequested:true, battleType:selected.value, offeredItem, transaction, notice:state.notice };
}
