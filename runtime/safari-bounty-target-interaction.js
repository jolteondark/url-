import { resolveBountyTarget } from "./mapless-normal-events-a4-flow.js";
import {
  registerSafariNormalEventBattleContinuation,
} from "./safari-normal-event-battle-continuation.js";
import {
  applySafariLargeItemReward,
  preflightSafariSharedLargeItemReward,
} from "./safari-large-item-reward.js";
import {
  borrowSafariSharedRunRandomInt,
  ensureSafariEncounterSeed,
} from "./safari-encounter-randomization.js";
import { activateSafariNormalEventTrainerBattle } from "./safari-web-combat-start.js";

const SAFARI_BAG_MAX_SLOTS = 20;

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}

function battleOperation(owner) {
  return (owner.operations ?? []).find((operation) => operation?.op === "start_trainer_battle") ?? null;
}

function battleWon(summary = {}) {
  return Number(summary.decision) === 1;
}

function addMoney(runtime, amount) {
  runtime.bag ??= { slots:[], money:0 };
  const value = Math.max(0, Math.trunc(Number(amount) || 0));
  runtime.bag.money = Math.max(0, Math.trunc(Number(runtime.bag.money ?? 0))) + value;
  return { op:"runtime_add_money", amount:value };
}

function hasGuaranteedLargeRewardCapacity(runtime) {
  return (runtime.bag?.slots ?? []).filter(Boolean).length < SAFARI_BAG_MAX_SLOTS;
}

function sharedLargeReward(runtime) {
  const state = stateOf(runtime);
  ensureSafariEncounterSeed(state);
  return preflightSafariSharedLargeItemReward(
    runtime,
    state.day,
    (limit) => borrowSafariSharedRunRandomInt(runtime, limit),
    1,
  );
}

registerSafariNormalEventBattleContinuation("bounty_target", (runtime, continuation) => {
  if (continuation.actionId !== "engage") throw new Error(`unsupported bounty_target Battle continuation action: ${continuation.actionId}`);
  const state = stateOf(runtime);
  const index = Number(continuation.boardIndex);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "bounty_target") {
    throw new Error("bounty_target continuation requires the originating board event");
  }

  const victory = battleWon(continuation.battleReturn);
  let reward = null;
  let applied = [];
  let moneyOp = null;
  if (victory) {
    reward = sharedLargeReward(runtime);
    if (!reward.success) throw new Error("bounty_target large reward no longer fits in Bag");
    applied = applySafariLargeItemReward(runtime, reward);
    moneyOp = addMoney(runtime, Number(event.normal_data?.reward ?? 0));
  }

  const owner = resolveBountyTarget({
    event,
    battle_outcome:victory ? 1 : 0,
    held_items:[],
  });
  state.board_events[index] = owner.event;
  state.board_consumed[index] = Boolean(owner.event.normal_resolved);
  state.mapless_bounty = null;
  state.last_operations = [
    ...(owner.operations ?? []).filter((operation) => !["start_trainer_battle", "grant_random", "add_money"].includes(operation?.op)).map((operation) => structuredClone(operation)),
    ...(reward?.operations ?? []).map((operation) => structuredClone(operation)),
    ...applied,
    ...(moneyOp ? [moneyOp] : []),
    { op:"request_save", reason:"normal_event_post_battle" },
  ];
  state.notice = victory
    ? `賞金首を倒し、${Math.max(0, Math.trunc(Number(event.normal_data?.reward ?? 0)))}円と報酬を受け取りました。`
    : "賞金首との戦いは終わりました。";
  return {
    runtime,
    result:owner.outcome,
    completed:true,
    terminal:true,
    reward,
    operations:state.last_operations,
    notice:state.notice,
    persistenceRequested:true,
    owner,
  };
});

export async function startSafariBountyTargetBattle(runtime, index) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "bounty_target") throw new Error("bounty_target board event is required");
  if (state.battle && !state.battle.completed) return { runtime, result:"battle_active", operations:[] };
  if (state.shop) return { runtime, result:"shop_active", operations:[] };
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", operations:[] };

  if (!hasGuaranteedLargeRewardCapacity(runtime)) {
    state.board_revealed[index] = true;
    state.notice = "賞金首を倒した後のcanonical報酬を確実に受け取れる空きがありません。バッグに空き枠を1つ作ってください。";
    return {
      runtime,
      result:"reward_capacity_required",
      completed:false,
      operations:[{ op:"bounty_target_reward_capacity_required", required_empty_slots:1 }],
      notice:state.notice,
      persistenceRequested:false,
    };
  }

  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  const owner = resolveBountyTarget({ event, battle_outcome:0, held_items:[] });
  const battleEvent = battleOperation(owner);
  if (!battleEvent) throw new Error("bounty_target requires canonical trainer Battle request");

  const started = await activateSafariNormalEventTrainerBattle(runtime, index, {
    eventId:"bounty_target",
    actionId:"engage",
    battleEvent,
    request:structuredClone(battleEvent),
    payload:{ reward:Number(event.normal_data?.reward ?? 0), seed:Number(event.normal_data?.seed ?? 0) },
  });
  if (started.result === "normal_event_trainer_battle_started" && state.battle) globalThis.__maplessNormalEventUi = null;
  return started;
}
