export * from "./safari-old-statue-break-collapse.js?v=20260828-2300";

import {
  resolveSafariOldStatueInteraction as resolveBaseOldStatueInteraction,
  safariOldStatuePresentation as baseOldStatuePresentation,
} from "./safari-old-statue-break-collapse.js?v=20260828-2300";
import { resolveOldStatue } from "./mapless-old-statue-flow.js";
import {
  MAPLESS_OLD_STATUE_MINERAL_ITEMS_V108,
  selectMaplessOldStatueMineralV108,
} from "./mapless-old-statue-v108-inputs.js";
import { resolveRewardTransaction } from "./bag-economy-reward-transaction.js";
import { projectMaplessNormalEventOptionalReward } from "./mapless-normal-event-optional-reward.js";
import { applySafariLargeItemReward, preflightSafariSharedLargeItemReward } from "./safari-large-item-reward.js";
import { borrowSafariSharedRunRandomInt, ensureSafariEncounterSeed } from "./safari-encounter-randomization.js";

const BAG_MAX_SLOTS = 20;
const BAG_MAX_PER_SLOT = 99;
const MINERAL_META = Object.freeze(Object.fromEntries(
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
  return { general:{ slots:runtime?.bag?.slots ?? [], maxSlots:BAG_MAX_SLOTS, maxPerSlot:BAG_MAX_PER_SLOT } };
}
function applyReward(runtime, reward) {
  if (!reward?.success) return [];
  runtime.bag ??= { slots:[], money:0 };
  runtime.bag.slots = reward.pockets.general.slots.filter(Boolean);
  return reward.granted.map((entry) => ({ op:"runtime_grant_item", item:entry.item, quantity:entry.quantity }));
}
function sharedCounter(runtime) {
  const state = stateOf(runtime);
  ensureSafariEncounterSeed(state);
  return Number(state.preview_encounter_counter ?? 0);
}
function rollback(runtime, counter) { stateOf(runtime).preview_encounter_counter = counter; }
function commit(runtime, index, owner, reward, optionalReward, applied, notice) {
  const state = stateOf(runtime);
  state.board_events[index] = owner.event;
  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  state.board_consumed[index] = Boolean(owner.event.normal_resolved);
  state.last_operations = [
    ...(owner.operations ?? []).filter((operation) => !["grant_random", "grant_statue_mineral"].includes(operation?.op)).map((operation) => structuredClone(operation)),
    ...(reward.success ? reward.operations : optionalReward.rewardOperations).map((operation) => structuredClone(operation)),
    ...applied,
    { op:"request_save", reason:"old_statue_break_reward" },
  ];
  state.notice = notice;
  return { runtime, result:owner.outcome, completed:true, owner, reward, optionalReward, operations:state.last_operations, notice, persistenceRequested:true };
}

export function safariOldStatuePresentation(runtime, index) {
  const presentation = baseOldStatuePresentation(runtime, index);
  return {
    ...presentation,
    actions:presentation.actions.map((action) => action.id === "break"
      ? { ...action, meta:"石像を壊します。全break結果をSafari接続済み" }
      : action),
  };
}

export async function resolveSafariOldStatueInteraction(runtime, index, requestedAction, options = {}) {
  const action = String(requestedAction ?? "");
  if (action !== "break") return await resolveBaseOldStatueInteraction(runtime, index, action, options);
  const state = stateOf(runtime);
  const event = eventAt(runtime, index);
  if (state.battle && !state.battle.completed) return { runtime, result:"battle_active", completed:false, operations:[] };
  if (state.shop) return { runtime, result:"shop_active", completed:false, operations:[] };
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", completed:true, operations:[] };

  const roll = Number(event.normal_data?.break_roll ?? 0);
  if (roll < 50 || roll >= 95) return await resolveBaseOldStatueInteraction(runtime, index, action, options);

  const counter = sharedCounter(runtime);
  let owner;
  let reward;
  if (roll < 80) {
    const selection = selectMaplessOldStatueMineralV108(
      MAPLESS_OLD_STATUE_MINERAL_ITEMS_V108,
      (limit) => borrowSafariSharedRunRandomInt(runtime, limit),
    );
    const item = selection?.value ?? null;
    if (!item) {
      rollback(runtime, counter);
      return { runtime, result:"old_statue_break_mineral_selection_failed", completed:false, operations:[], persistenceRequested:false };
    }
    reward = resolveRewardTransaction({ pockets:pockets(runtime), itemMeta:MINERAL_META, items:[item] });
    if (!reward.success) rollback(runtime, counter);
    owner = resolveOldStatue({ event, choice:"break", grant_result:reward.success });
    const optionalReward = projectMaplessNormalEventOptionalReward({ ownerResult:owner, rewardResult:reward });
    const applied = reward.success ? applyReward(runtime, reward) : [];
    return commit(
      runtime,
      index,
      owner,
      reward,
      optionalReward,
      applied,
      reward.success ? `石像の中から${item}を見つけました。` : "石像の中に鉱物を見つけましたが、バッグがいっぱいで持ち帰れませんでした。",
    );
  }

  reward = preflightSafariSharedLargeItemReward(
    runtime,
    state.day,
    (limit) => borrowSafariSharedRunRandomInt(runtime, limit),
    1,
  );
  if (!reward.success) rollback(runtime, counter);
  owner = resolveOldStatue({ event, choice:"break" });
  const optionalReward = projectMaplessNormalEventOptionalReward({ ownerResult:owner, rewardResult:reward });
  const applied = reward.success ? applySafariLargeItemReward(runtime, reward) : [];
  const item = reward.selectedItems?.[0] ?? "道具";
  return commit(
    runtime,
    index,
    owner,
    reward,
    optionalReward,
    applied,
    reward.success ? `古い供物から${item}を手に入れました。` : "古い供物を見つけましたが、バッグがいっぱいで持ち帰れませんでした。",
  );
}
