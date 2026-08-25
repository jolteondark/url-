import { resolveLostBag } from "./mapless-lost-bag-flow.js";
import {
  MAPLESS_NORMAL_EVENT_MID_REWARD_ITEMS,
  resolveMaplessNormalEventMediumReward,
} from "./mapless-normal-event-medium-reward.js";
import { MAPLESS_NORMAL_EVENT_SMALL_REWARD_ITEMS } from "./mapless-normal-event-small-reward.js";
import { RubyMT19937Random } from "./ruby-mt19937-random.js";
import {
  borrowSafariSharedRunRandomInt,
  ensureSafariEncounterSeed,
} from "./safari-encounter-randomization.js";
import { registerSafariNormalEventBattleContinuation } from "./safari-normal-event-battle-continuation.js";
import { hasSafariUsablePartyType } from "./safari-pokemon-type-membership.js";
import { activateSafariNormalEventTrainerBattle } from "./safari-web-combat-start.js";

const SAFARI_BAG_MAX_SLOTS = 20;
const SAFARI_BAG_MAX_PER_SLOT = 99;
const MEDIUM_ITEM_META = Object.freeze(Object.fromEntries(
  [...MAPLESS_NORMAL_EVENT_SMALL_REWARD_ITEMS, ...MAPLESS_NORMAL_EVENT_MID_REWARD_ITEMS]
    .map((id) => [id, Object.freeze({ valid:true, pocket:"general" })]),
));

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}
function scalingValue(day) { return Math.max(Math.floor((Math.max(1, Number(day) || 1) - 1) / 5), 0); }
function dayOf(state) { return Math.max(1, Math.trunc(Number(state.day) || 1)); }
function bagSlots(runtime) { return runtime.bag?.slots ?? []; }
function rewardPockets(runtime) {
  return { general:{ slots:bagSlots(runtime), maxSlots:SAFARI_BAG_MAX_SLOTS, maxPerSlot:SAFARI_BAG_MAX_PER_SLOT } };
}
function resolveMediumReward(runtime, count, randomInt) {
  return resolveMaplessNormalEventMediumReward({
    day:dayOf(stateOf(runtime)),
    count,
    randomInt,
    itemMeta:MEDIUM_ITEM_META,
    pockets:rewardPockets(runtime),
  });
}
function applyMediumReward(runtime, reward) {
  if (!reward?.success) return [];
  runtime.bag ??= { slots:[], money:0 };
  runtime.bag.slots = reward.pockets.general.slots.filter(Boolean);
  return (reward.granted ?? []).map((entry) => ({ op:"runtime_grant_item", item:entry.item, quantity:entry.quantity }));
}
function sharedMediumReward(runtime, count) {
  const state = stateOf(runtime);
  ensureSafariEncounterSeed(state);
  const counter = state.preview_encounter_counter;
  const reward = resolveMediumReward(runtime, count, (max) => borrowSafariSharedRunRandomInt(runtime, max));
  if (!reward.success) state.preview_encounter_counter = counter;
  return reward;
}
function addMoney(runtime, amount) {
  const value = Math.max(0, Math.trunc(Number(amount) || 0));
  runtime.bag ??= { slots:[], money:0 };
  runtime.bag.money = Math.max(0, Math.trunc(Number(runtime.bag.money ?? 0))) + value;
  return { op:"runtime_add_money", amount:value };
}
function commit(runtime, index, owner, applied = []) {
  const state = stateOf(runtime);
  state.board_events[index] = owner.event;
  state.board_visited[index] = true;
  state.board_consumed[index] = Boolean(owner.event.normal_resolved);
  state.last_operations = [
    ...(owner.operations ?? [])
      .filter((operation) => operation?.op !== "grant_random" && operation?.op !== "add_money" && operation?.op !== "start_trainer_battle_request")
      .map((operation) => structuredClone(operation)),
    ...applied,
    { op:"request_save", reason:"lost_bag_resolved" },
  ];
  return state;
}
function battleSucceeded(summary = {}) {
  const decision = Number(summary.decision);
  return decision === 1 || decision === 4;
}
function trainerRequest(owner) {
  return (owner.operations ?? []).find((operation) => operation?.op === "start_trainer_battle_request") ?? null;
}
function trapWarning(runtime, event) {
  return event?.normal_data?.trap === true && hasSafariUsablePartyType(runtime, "DARK", "PSYCHIC");
}

registerSafariNormalEventBattleContinuation("lost_bag", (runtime, continuation) => {
  if (continuation.actionId !== "open") throw new Error(`unsupported lost_bag Battle continuation action: ${continuation.actionId}`);
  const state = stateOf(runtime);
  const index = Number(continuation.boardIndex);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "lost_bag") throw new Error("lost_bag continuation requires the originating board event");
  const success = battleSucceeded(continuation.battleReturn);
  const reward = success ? sharedMediumReward(runtime, 1) : null;
  if (success && !reward?.success) throw new Error("lost_bag post-battle medium reward no longer fits in Bag");
  const owner = resolveLostBag({
    event,
    choice:"open",
    has_dark_or_psychic:trapWarning(runtime, event),
    current_day:dayOf(state),
    scaling_value:scalingValue(state.day),
    battle_result:continuation.battleReturn,
    battle_success:success,
    grant_random_result:reward?.success ?? false,
  });
  const applied = [];
  if (reward) {
    applied.push(...reward.operations.map((operation) => structuredClone(operation)));
    applied.push(...applyMediumReward(runtime, reward));
  }
  commit(runtime, index, owner, applied);
  const itemText = reward?.selectedItems?.length ? ` ${reward.selectedItems.join("・")}を受け取りました。` : "";
  state.notice = success ? `罠を仕掛けたトレーナーに勝ちました。${itemText}`.trim() : "罠を仕掛けたトレーナーとの勝負を終えました。";
  return { runtime, result:owner.outcome, completed:true, terminal:true, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner, reward };
});

export function safariLostBagWarning(runtime, index) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  return trapWarning(runtime, event);
}

export async function resolveSafariLostBagInteraction(runtime, index, requestedAction) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "lost_bag") throw new Error("lost_bag board event is required");
  if (state.battle && !state.battle.completed) return { runtime, result:"battle_active", operations:[] };
  if (state.shop) return { runtime, result:"shop_active", operations:[] };
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", operations:[] };
  state.board_revealed[index] = true;
  state.board_visited[index] = true;

  const action = String(requestedAction ?? "");
  const availableActions = ["open", "wait", "leave"];
  if (!availableActions.includes(action)) return { runtime, result:"unsupported_action", completed:false, availableActions, operations:[], persistenceRequested:false };
  const warned = trapWarning(runtime, event);
  const scale = scalingValue(state.day);
  const day = dayOf(state);

  if (action === "leave") {
    const owner = resolveLostBag({ event, choice:"leave", has_dark_or_psychic:warned, current_day:day, scaling_value:scale });
    commit(runtime, index, owner);
    state.notice = "落とし物には触れず、その場を離れました。";
    return { runtime, result:owner.outcome, completed:true, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
  }

  if (event.normal_data?.trap === true) {
    if (action === "wait") {
      state.notice = "罠を警戒して待つルートは、追加ポケモン付きトレーナー戦の共有Battle owner接続待ちです。袋はまだ消費していません。";
      return {
        runtime,
        result:"extra_pokemon_trainer_owner_required",
        completed:false,
        blockedBy:"#846",
        availableActions,
        operations:[{ op:"lost_bag_wait_trap_blocked", blocker:"extra_pokemon:true" }],
        notice:state.notice,
        persistenceRequested:false,
      };
    }
    const preview = resolveLostBag({
      event,
      choice:"open",
      has_dark_or_psychic:warned,
      current_day:day,
      scaling_value:scale,
      battle_success:false,
      grant_random_result:false,
    });
    const battleEvent = trainerRequest(preview);
    if (!battleEvent) throw new Error("lost_bag trapped open route did not request trainer Battle");
    const started = await activateSafariNormalEventTrainerBattle(runtime, index, {
      eventId:"lost_bag",
      actionId:"open",
      battleEvent,
      request:structuredClone(battleEvent),
      payload:{ trap:true },
    });
    if (started.result === "normal_event_trainer_battle_started" && state.battle) globalThis.__maplessNormalEventUi = null;
    return started;
  }

  if (action === "open") {
    const rng = new RubyMT19937Random(Number(event.normal_seed ?? 0) & 0x7fffffff);
    const reward = resolveMediumReward(runtime, 2, (max) => rng.randInt(max));
    if (!reward.success) {
      state.notice = "落とし物の中身を受け取るバッグの空きがありません。袋はまだ開けていません。";
      return { runtime, result:"reward_bag_full", completed:false, availableActions, operations:reward.operations ?? [], notice:state.notice, persistenceRequested:false };
    }
    const owner = resolveLostBag({ event, choice:"open", has_dark_or_psychic:warned, current_day:day, scaling_value:scale, grant_random_result:true });
    const applied = [...reward.operations.map((operation) => structuredClone(operation)), ...applyMediumReward(runtime, reward)];
    commit(runtime, index, owner, applied);
    state.notice = `落とし物を開け、${reward.selectedItems.join("・")}を手に入れました。`;
    return { runtime, result:owner.outcome, completed:true, reward, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
  }

  const waitRoll = Number(event.normal_data?.wait_roll ?? 0);
  let reward = null;
  if (waitRoll < 70) {
    reward = sharedMediumReward(runtime, 1);
    if (!reward.success) {
      state.notice = "持ち主のお礼を受け取るバッグの空きがありません。イベントはまだ完了していません。";
      return { runtime, result:"reward_bag_full", completed:false, availableActions, operations:reward.operations ?? [], notice:state.notice, persistenceRequested:false };
    }
  }
  const owner = resolveLostBag({
    event,
    choice:"wait",
    has_dark_or_psychic:warned,
    current_day:day,
    scaling_value:scale,
    grant_random_result:reward?.success ?? true,
    add_money_result:true,
  });
  const applied = [];
  if (reward) {
    applied.push(...reward.operations.map((operation) => structuredClone(operation)));
    applied.push(...applyMediumReward(runtime, reward));
  }
  const moneyOperation = (owner.operations ?? []).find((operation) => operation?.op === "add_money");
  if (moneyOperation) applied.push(addMoney(runtime, moneyOperation.amount));
  commit(runtime, index, owner, applied);
  state.notice = owner.outcome === "owner_returned"
    ? `持ち主が戻り、お礼に${moneyOperation?.amount ?? 0}円${reward?.selectedItems?.length ? `と${reward.selectedItems.join("・")}` : ""}を受け取りました。`
    : "しばらく待ちましたが、持ち主は戻りませんでした。";
  return { runtime, result:owner.outcome, completed:true, reward, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
}
