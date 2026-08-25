import {
  resolveSafariOldStatueInteraction as resolveBaseOldStatueInteraction,
  safariOldStatuePresentation as baseOldStatuePresentation,
} from "./safari-old-statue-interaction.js";
import { resolveOldStatue } from "./mapless-old-statue-flow.js";
import {
  MAPLESS_OLD_STATUE_MINERAL_ITEMS_V108,
  selectMaplessOldStatueMineralV108,
} from "./mapless-old-statue-v108-inputs.js";
import { MAPLESS_NORMAL_EVENT_MID_REWARD_ITEMS } from "./mapless-normal-event-medium-reward.js";
import {
  MAPLESS_NORMAL_EVENT_LARGE_REWARD_ITEMS,
  resolveMaplessNormalEventLargeReward,
} from "./mapless-normal-event-large-reward.js";
import { resolveRewardTransaction } from "./bag-economy-reward-transaction.js";
import { borrowSafariSharedRunRandomInt, ensureSafariEncounterSeed } from "./safari-encounter-randomization.js";
import { damageSafariPokemonPercent } from "./safari-pokemon-healing.js";

const SAFARI_BAG_MAX_SLOTS = 20;
const SAFARI_BAG_MAX_PER_SLOT = 99;
const LARGE_ITEM_META = Object.freeze(Object.fromEntries(
  [...MAPLESS_NORMAL_EVENT_MID_REWARD_ITEMS, ...MAPLESS_NORMAL_EVENT_LARGE_REWARD_ITEMS]
    .map((id) => [id, Object.freeze({ valid:true, pocket:"general" })]),
));
const MINERAL_ITEM_META = Object.freeze(Object.fromEntries(
  MAPLESS_OLD_STATUE_MINERAL_ITEMS_V108.map((id) => [id, Object.freeze({ valid:true, pocket:"general" })]),
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
function applyReward(runtime, transaction) {
  if (!transaction?.success) return [];
  runtime.bag ??= { slots:[], money:0 };
  runtime.bag.slots = transaction.pockets.general.slots.filter(Boolean);
  return (transaction.granted ?? []).map((entry) => ({ op:"runtime_grant_item", item:entry.item, quantity:entry.quantity }));
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
function sharedLargeReward(runtime) {
  const state = stateOf(runtime);
  ensureSafariEncounterSeed(state);
  const counter = state.preview_encounter_counter;
  const reward = resolveMaplessNormalEventLargeReward({
    day:Math.max(1, Math.trunc(Number(state.day) || 1)),
    count:1,
    randomInt:(max) => borrowSafariSharedRunRandomInt(runtime, max),
    itemMeta:LARGE_ITEM_META,
    pockets:pockets(runtime),
  });
  if (!reward.success) state.preview_encounter_counter = counter;
  return reward;
}
function sharedMineralReward(runtime) {
  const state = stateOf(runtime);
  ensureSafariEncounterSeed(state);
  const counter = state.preview_encounter_counter;
  const selected = selectMaplessOldStatueMineralV108(
    MAPLESS_OLD_STATUE_MINERAL_ITEMS_V108,
    (max) => borrowSafariSharedRunRandomInt(runtime, max),
  );
  if (!selected?.value) {
    state.preview_encounter_counter = counter;
    return { success:false, result:"empty_pool", operations:[] };
  }
  const transaction = resolveRewardTransaction({
    pockets:pockets(runtime),
    itemMeta:MINERAL_ITEM_META,
    items:[selected.value],
  });
  if (!transaction.success) state.preview_encounter_counter = counter;
  return {
    ...transaction,
    selectedItem:selected.value,
    operations:[{ op:"select_old_statue_mineral", item:selected.value, index:selected.index }, ...(transaction.operations ?? [])],
  };
}
function applyPartyDamage(runtime, percent) {
  runtime.player ??= { party:[] };
  runtime.player.party = (runtime.player.party ?? []).map((pokemon) => pokemon ? damageSafariPokemonPercent(pokemon, percent) : pokemon);
  return [{ op:"runtime_damage_party_percent", percent }];
}

export function safariOldStatuePresentation(runtime, index) {
  const presentation = baseOldStatuePresentation(runtime, index);
  return {
    ...presentation,
    actions:presentation.actions.map((action) => action.id === "break"
      ? { ...action, meta:"鉱物・大きな道具・崩落ダメージは接続済み。守護者戦のみ共有Battle接続待ち" }
      : action),
  };
}

export async function resolveSafariOldStatueInteraction(runtime, index, requestedAction) {
  const action = String(requestedAction ?? "");
  if (action !== "break") return await resolveBaseOldStatueInteraction(runtime, index, action);

  const state = stateOf(runtime);
  const event = eventAt(runtime, index);
  if (state.battle && !state.battle.completed) return { runtime, result:"battle_active", completed:false, operations:[] };
  if (state.shop) return { runtime, result:"shop_active", completed:false, operations:[] };
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", completed:true, operations:[] };
  state.board_revealed[index] = true;
  state.board_visited[index] = true;

  const roll = Number(event.normal_data?.break_roll ?? 0);
  if (roll < 50) {
    return pending(runtime, "old_statue_guardian_battle_pending", "守護者戦だけ共有Battle continuation接続待ちです。イベントは消費していません。");
  }

  if (roll < 80) {
    const reward = sharedMineralReward(runtime);
    if (!reward.success) return pending(runtime, "reward_bag_full", "石像から見つけた鉱物を受け取るバッグの空きがありません。イベントと共有RNGは消費していません。");
    const owner = resolveOldStatue({ event, choice:"break", grant_result:true });
    const applied = [...(reward.operations ?? []).map((operation) => structuredClone(operation)), ...applyReward(runtime, reward)];
    commit(runtime, index, owner, applied);
    state.notice = `石像の中から${reward.selectedItem}を見つけました。`;
    return { runtime, result:owner.outcome, completed:true, reward, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
  }

  if (roll < 95) {
    const reward = sharedLargeReward(runtime);
    if (!reward.success) return pending(runtime, "reward_bag_full", "古い供物を受け取るバッグの空きがありません。イベントと共有RNGは消費していません。");
    const owner = resolveOldStatue({ event, choice:"break", grant_result:true });
    const applied = [...(reward.operations ?? []).map((operation) => structuredClone(operation)), ...applyReward(runtime, reward)];
    commit(runtime, index, owner, applied);
    state.notice = `石像の中から${reward.selectedItems?.join("・") ?? "古い供物"}を見つけました。`;
    return { runtime, result:owner.outcome, completed:true, reward, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
  }

  const owner = resolveOldStatue({ event, choice:"break" });
  const applied = applyPartyDamage(runtime, 15);
  commit(runtime, index, owner, applied);
  state.notice = "石像が崩れ、手持ち全体が傷つきました。";
  return { runtime, result:owner.outcome, completed:true, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
}
