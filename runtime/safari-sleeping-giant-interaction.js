import { resolveRewardTransaction } from "./bag-economy-reward-transaction.js";
import { resolveSleepingGiant } from "./mapless-normal-events-a2-flow.js";
import { registerSafariNormalEventBattleContinuation } from "./safari-normal-event-battle-continuation.js";
import { activateSafariNormalEventWildBattle } from "./safari-web-combat-start.js";

const SAFARI_BAG_MAX_SLOTS = 20;
const SAFARI_BAG_MAX_PER_SLOT = 99;

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}
function displayedItem(event) {
  const item = String(event?.normal_data?.display_item ?? "").trim();
  if (!item) throw new Error("sleeping_giant display_item unresolved");
  return item;
}
function reward(runtime, item) {
  return resolveRewardTransaction({
    pockets:{ general:{ slots:runtime.bag?.slots ?? [], maxSlots:SAFARI_BAG_MAX_SLOTS, maxPerSlot:SAFARI_BAG_MAX_PER_SLOT } },
    itemMeta:{ [item]:{ valid:true, pocket:"general" } },
    items:[item],
  });
}
function applyReward(runtime, resolved) {
  if (!resolved?.success) return [];
  runtime.bag ??= { slots:[], money:0 };
  runtime.bag.slots = resolved.pockets.general.slots.filter(Boolean);
  return resolved.granted.map((entry) => ({ op:"runtime_grant_item", item:entry.item, quantity:entry.quantity }));
}
function battleOperation(owner) { return (owner.operations ?? []).find((operation) => operation?.op === "start_wild_battle") ?? null; }
function battleSucceeded(summary={}) { const decision=Number(summary.decision); return decision===1 || decision===4; }

registerSafariNormalEventBattleContinuation("sleeping_giant", (runtime, continuation) => {
  if (continuation.actionId !== "steal" && continuation.actionId !== "fight") throw new Error(`unsupported sleeping_giant continuation: ${continuation.actionId}`);
  const state = stateOf(runtime);
  const index = Number(continuation.boardIndex);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "sleeping_giant") throw new Error("sleeping_giant continuation requires originating event");
  const success = battleSucceeded(continuation.battleReturn);
  const item = displayedItem(event);
  const preflight = success ? reward(runtime, item) : null;
  if (preflight && !preflight.success) throw new Error("sleeping_giant post-battle reward no longer fits in Bag");
  const owner = resolveSleepingGiant({ event, action:continuation.actionId, battle_success:success });
  const applied = applyReward(runtime, preflight);
  state.board_events[index] = owner.event;
  state.board_consumed[index] = Boolean(owner.event.normal_resolved);
  state.last_operations = [
    ...(owner.operations ?? []).filter((operation) => operation?.op !== "start_wild_battle" && operation?.op !== "grant_items").map((operation) => structuredClone(operation)),
    ...(preflight?.operations ?? []).map((operation) => structuredClone(operation)),
    ...applied,
    { op:"request_save", reason:"normal_event_post_battle" },
  ];
  state.notice = success ? `巨体のポケモンを退け、${item}を回収しました。` : "巨体のポケモンとの戦いから離れました。";
  return { runtime, result:owner.outcome, completed:true, terminal:true, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
});

export async function resolveSafariSleepingGiantInteraction(runtime, index, requestedAction) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "sleeping_giant") throw new Error("sleeping_giant board event is required");
  if (state.battle && !state.battle.completed) return { runtime, result:"battle_active", operations:[] };
  if (state.shop) return { runtime, result:"shop_active", operations:[] };
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", operations:[] };
  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  const action = String(requestedAction ?? "");
  const availableActions = ["steal","fight","leave"];
  if (!availableActions.includes(action)) return { runtime, result:"unsupported_action", completed:false, operations:[], availableActions };
  if (action === "leave") {
    const owner = resolveSleepingGiant({ event, action:"leave" });
    state.board_events[index] = owner.event;
    state.board_consumed[index] = Boolean(owner.event.normal_resolved);
    state.last_operations = (owner.operations ?? []).map((operation) => structuredClone(operation));
    state.notice = "眠っている巨体を刺激せず立ち去りました。";
    return { runtime, result:owner.outcome, completed:true, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
  }
  const item = displayedItem(event);
  const preflight = reward(runtime, item);
  if (!preflight.success) {
    state.notice = `${item}を受け取る空きがありません。バッグを空けてから試してください。`;
    return { runtime, result:"reward_bag_full", completed:false, operations:preflight.operations.map((operation) => structuredClone(operation)), notice:state.notice, persistenceRequested:false, availableActions };
  }
  const preview = resolveSleepingGiant({ event, action, battle_success:false });
  const battleEvent = battleOperation(preview);
  if (!battleEvent) {
    const owner = resolveSleepingGiant({ event, action });
    const applied = applyReward(runtime, preflight);
    state.board_events[index] = owner.event;
    state.board_consumed[index] = Boolean(owner.event.normal_resolved);
    state.last_operations = [
      ...(owner.operations ?? []).filter((operation) => operation?.op !== "grant_items").map((operation) => structuredClone(operation)),
      ...(preflight.operations ?? []).map((operation) => structuredClone(operation)),
      ...applied,
    ];
    state.notice = `眠っている隙に${item}を回収しました。`;
    return { runtime, result:owner.outcome, completed:true, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
  }
  const started = await activateSafariNormalEventWildBattle(runtime, index, {
    eventId:"sleeping_giant",
    actionId:action,
    battleEvent,
    request:structuredClone(battleEvent),
    payload:{ display_item:item, boost_stat:event.normal_data?.boost_stat },
  });
  if (started.result === "normal_event_wild_battle_started" && state.battle) globalThis.__maplessNormalEventUi = null;
  return started;
}
