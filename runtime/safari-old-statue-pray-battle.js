import {
  resolveSafariOldStatueInteraction as resolveBaseOldStatueInteraction,
  safariOldStatueBonusCandidates,
  safariOldStatuePrayNeedsPokemon,
  safariOldStatuePresentation as baseOldStatuePresentation,
} from "./safari-old-statue-pray-power-meal.js";
import { resolveOldStatue } from "./mapless-old-statue-flow.js";
import {
  resolveMaplessOldStatueOutcomeV108,
  selectMaplessOldStatueBattleTypeV108,
} from "./mapless-old-statue-v108-inputs.js";
import { MAPLESS_NORMAL_EVENT_MID_REWARD_ITEMS, maplessNormalEventScalingValue } from "./mapless-normal-event-medium-reward.js";
import {
  MAPLESS_NORMAL_EVENT_LARGE_REWARD_ITEMS,
  resolveMaplessNormalEventLargeReward,
} from "./mapless-normal-event-large-reward.js";
import { borrowSafariSharedRunRandomInt, ensureSafariEncounterSeed } from "./safari-encounter-randomization.js";
import { registerSafariNormalEventBattleContinuation } from "./safari-normal-event-battle-continuation.js";
import { activateSafariNormalEventWildBattle } from "./safari-web-combat-start.js";
import { applySafariBattleRunConstraint } from "./safari-battle-run-constraint.js";

const SAFARI_BAG_MAX_SLOTS = 20;
const SAFARI_BAG_MAX_PER_SLOT = 99;
const LARGE_ITEM_META = Object.freeze(Object.fromEntries(
  [...MAPLESS_NORMAL_EVENT_MID_REWARD_ITEMS, ...MAPLESS_NORMAL_EVENT_LARGE_REWARD_ITEMS]
    .map((id) => [id, Object.freeze({ valid:true, pocket:"general" })]),
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
function prayOutcome(event) {
  return resolveMaplessOldStatueOutcomeV108({
    normalSeed:Number(event.normal_seed),
    roll:Number(event.normal_data?.pray_roll ?? 0),
    goodLimit:50,
    neutralLimit:80,
  });
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
function largeRewardPockets(runtime) {
  return { general:{ slots:runtime?.bag?.slots ?? [], maxSlots:SAFARI_BAG_MAX_SLOTS, maxPerSlot:SAFARI_BAG_MAX_PER_SLOT } };
}
function sharedLargeReward(runtime) {
  const state = stateOf(runtime);
  ensureSafariEncounterSeed(state);
  const counter = Number(state.preview_encounter_counter ?? 0);
  const reward = resolveMaplessNormalEventLargeReward({
    day:Math.max(1, Math.trunc(Number(state.day) || 1)),
    count:1,
    randomInt:(max) => borrowSafariSharedRunRandomInt(runtime, max),
    itemMeta:LARGE_ITEM_META,
    pockets:largeRewardPockets(runtime),
  });
  if (!reward.success) state.preview_encounter_counter = counter;
  return reward;
}
function applyLargeReward(runtime, reward) {
  if (!reward?.success) return [];
  runtime.bag ??= { slots:[], money:0 };
  runtime.bag.slots = reward.pockets.general.slots.filter(Boolean);
  return [
    ...(reward.operations ?? []).map((operation) => structuredClone(operation)),
    ...(reward.granted ?? []).map((entry) => ({ op:"runtime_grant_item", item:entry.item, quantity:entry.quantity })),
  ];
}
function guardianRewardPending(event) {
  return event?.normal_data?.guardian_reward_pending === true;
}
function markGuardianRewardPending(runtime, index) {
  const state = stateOf(runtime);
  const event = eventAt(runtime, index);
  event.normal_data ??= {};
  event.normal_data.guardian_reward_pending = true;
  state.board_events[index] = event;
  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  state.board_consumed[index] = false;
  state.last_operations = [
    { op:"old_statue_guardian_defeated_reward_pending" },
    { op:"request_save", reason:"old_statue_guardian_reward_pending" },
  ];
  state.notice = "守護者を倒しました。バッグに空きを作って報酬を受け取ってください。";
  return state;
}
function guardianRewardEvent(event) {
  const next = structuredClone(event);
  if (next.normal_data) delete next.normal_data.guardian_reward_pending;
  return next;
}
function finishGuardianReward(runtime, index, event) {
  const reward = sharedLargeReward(runtime);
  if (!reward.success) {
    const state = markGuardianRewardPending(runtime, index);
    return { runtime, result:"old_statue_guardian_reward_pending", completed:false, terminal:true, reward, operations:state.last_operations, notice:state.notice, persistenceRequested:true };
  }
  const owner = resolveOldStatue({ event:guardianRewardEvent(event), choice:"break", battle_success:true });
  const state = commit(runtime, index, owner, applyLargeReward(runtime, reward));
  state.notice = `守護者を倒し、${reward.selectedItems?.join("・") ?? "大きな報酬"}を手に入れました。`;
  return { runtime, result:owner.outcome, completed:true, terminal:true, reward, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
}

registerSafariNormalEventBattleContinuation("old_statue", (runtime, continuation) => {
  const index = Number(continuation.boardIndex);
  const event = eventAt(runtime, index);

  if (continuation.actionId === "break") {
    if (Number(event.normal_data?.break_roll ?? 0) >= 50) throw new Error("old_statue break continuation requires guardian Battle outcome");
    const decision = Number(continuation.battleReturn?.decision ?? 0);
    if (decision === 1) return finishGuardianReward(runtime, index, event);
    const owner = resolveOldStatue({ event:guardianRewardEvent(event), choice:"break", battle_success:false });
    const state = commit(runtime, index, owner, [{ op:"runtime_normal_event_battle_return", type:"ROCK", decision }]);
    state.notice = "石像の守護者との戦いを終えました。";
    return { runtime, result:owner.outcome, completed:true, terminal:true, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
  }

  if (continuation.actionId === "offer") {
    const resolved = offerOutcome(event);
    if (!(resolved.branch === "neutral" && resolved.effectIndex === 0)) throw new Error("old_statue offer continuation requires neutral Battle outcome");
    const type = String(continuation.payload?.battle_type ?? "");
    const offeredItem = String(continuation.payload?.offered_item ?? "");
    if (!offeredItem) throw new Error("old_statue offer continuation requires offered item");
    const owner = resolveOldStatue({
      event,
      choice:"offer",
      offered_item:offeredItem,
      remove_result:true,
      scaling_value:maplessNormalEventScalingValue(stateOf(runtime).day),
      outcome:{ effect_index:resolved.effectIndex, status:resolved.status, type_id:type },
    });
    const state = commit(runtime, index, owner, [{ op:"runtime_normal_event_battle_return", type, decision:Number(continuation.battleReturn?.decision ?? 0), offered_item:offeredItem }]);
    state.notice = "供物に応じて現れたポケモンとの戦いを終えました。";
    return { runtime, result:owner.outcome, completed:true, terminal:true, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
  }

  if (continuation.actionId !== "pray") throw new Error("old_statue continuation only owns pray/offer/break Battle here");
  const resolved = prayOutcome(event);
  if (!(resolved.branch === "neutral" && resolved.effectIndex === 0)) throw new Error("old_statue pray continuation requires neutral Battle outcome");
  const type = String(continuation.payload?.battle_type ?? "");
  const owner = resolveOldStatue({
    event,
    choice:"pray",
    scaling_value:maplessNormalEventScalingValue(stateOf(runtime).day),
    outcome:{ effect_index:resolved.effectIndex, status:resolved.status, type_id:type },
  });
  const state = commit(runtime, index, owner, [{ op:"runtime_normal_event_battle_return", type, decision:Number(continuation.battleReturn?.decision ?? 0) }]);
  state.notice = "石像から現れたポケモンとの戦いを終えました。";
  return { runtime, result:owner.outcome, completed:true, terminal:true, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
});

export { safariOldStatueBonusCandidates, safariOldStatuePrayNeedsPokemon };

export function safariOldStatuePresentation(runtime, index) {
  const presentation = baseOldStatuePresentation(runtime, index);
  const event = eventAt(runtime, index);
  return {
    ...presentation,
    actions:presentation.actions.map((action) => {
      if (action.id === "pray") return { ...action, meta:"回復・個体ボーナス・道具・お金・一戦の力・野生戦・災いなどを接続済み" };
      if (action.id === "break") return { ...action, meta:guardianRewardPending(event) ? "守護者撃破済み。大きな報酬を受け取る" : "鉱物・大きな道具・崩落・守護者戦を接続済み" };
      return action;
    }),
  };
}

export async function resolveSafariOldStatueInteraction(runtime, index, requestedAction, options = {}) {
  const action = String(requestedAction ?? "");
  const state = stateOf(runtime);
  const event = eventAt(runtime, index);

  if (action === "break" && Number(event.normal_data?.break_roll ?? 0) < 50) {
    if (state.battle && !state.battle.completed) return { runtime, result:"battle_active", completed:false, operations:[] };
    if (state.shop) return { runtime, result:"shop_active", completed:false, operations:[] };
    if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", completed:true, operations:[] };
    if (guardianRewardPending(event)) return finishGuardianReward(runtime, index, event);

    const preview = resolveOldStatue({ event, choice:"break", battle_success:false });
    const battleEvent = battleOperation(preview);
    if (!battleEvent) throw new Error("old_statue break did not request guardian Battle");
    const started = await activateSafariNormalEventWildBattle(runtime, index, {
      eventId:"old_statue",
      actionId:"break",
      battleEvent,
      request:structuredClone(battleEvent),
      payload:{ battle_type:"ROCK", modifier:2, cannot_run:true },
    });
    if (started.result !== "normal_event_wild_battle_started") return started;
    applySafariBattleRunConstraint(runtime, true);
    if (state.battle) globalThis.__maplessNormalEventUi = null;
    const operations = [
      ...(started.operations ?? []),
      { op:"apply_battle_run_constraint", cannot_run:true },
      { op:"request_save", reason:"old_statue_guardian_battle_started" },
    ];
    state.last_operations = operations;
    return { ...started, operations, persistenceRequested:true, battleType:"ROCK", modifier:2, cannotRun:true };
  }

  if (action !== "pray") return await resolveBaseOldStatueInteraction(runtime, index, action, options);

  if (state.battle && !state.battle.completed) return { runtime, result:"battle_active", completed:false, operations:[] };
  if (state.shop) return { runtime, result:"shop_active", completed:false, operations:[] };
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", completed:true, operations:[] };

  const resolved = prayOutcome(event);
  if (!(resolved.branch === "neutral" && resolved.effectIndex === 0)) {
    return await resolveBaseOldStatueInteraction(runtime, index, action, options);
  }

  ensureSafariEncounterSeed(state);
  const counter = Number(state.preview_encounter_counter ?? 0);
  const selected = selectMaplessOldStatueBattleTypeV108((max) => borrowSafariSharedRunRandomInt(runtime, max));
  if (!selected?.value) {
    state.preview_encounter_counter = counter;
    state.notice = "石像の戦闘タイプ抽選に失敗しました。イベントと共有RNGは消費していません。";
    return { runtime, result:"old_statue_battle_type_selection_failed", completed:false, operations:[], notice:state.notice, persistenceRequested:false };
  }

  const preview = resolveOldStatue({
    event,
    choice:"pray",
    scaling_value:maplessNormalEventScalingValue(state.day),
    outcome:{ effect_index:resolved.effectIndex, status:resolved.status, type_id:selected.value },
  });
  const battleEvent = battleOperation(preview);
  if (!battleEvent) {
    state.preview_encounter_counter = counter;
    throw new Error("old_statue pray did not request Battle");
  }
  const started = await activateSafariNormalEventWildBattle(runtime, index, {
    eventId:"old_statue",
    actionId:"pray",
    battleEvent,
    request:structuredClone(battleEvent),
    payload:{ battle_type:selected.value },
  });
  if (started.result !== "normal_event_wild_battle_started") {
    state.preview_encounter_counter = counter;
    return started;
  }
  if (state.battle) globalThis.__maplessNormalEventUi = null;
  const operations = [
    { op:"select_old_statue_battle_type", type:selected.value, index:selected.index },
    ...(started.operations ?? []),
    { op:"request_save", reason:"old_statue_battle_started" },
  ];
  state.last_operations = operations;
  return { ...started, operations, persistenceRequested:true, battleType:selected.value };
}
