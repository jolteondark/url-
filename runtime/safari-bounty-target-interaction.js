import { resolveBountyTarget } from "./mapless-normal-events-a4-flow.js";
import {
  registerSafariNormalEventBattleContinuation,
} from "./safari-normal-event-battle-continuation.js";
import {
  preflightSafariSharedLargeItemReward,
} from "./safari-large-item-reward.js";
import { commitSafariBagEconomyReceipt } from "./safari-bag-economy-receipt.js";
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

function operation(owner, op) {
  return (owner.operations ?? []).find((entry) => entry?.op === op) ?? null;
}

function battleOperation(owner) {
  return operation(owner, "start_trainer_battle");
}

function battleWon(summary = {}) {
  return Number(summary.decision) === 1;
}

function hasGuaranteedLargeRewardCapacity(runtime, quantity = 1) {
  const emptySlots = Math.max(0, SAFARI_BAG_MAX_SLOTS - (runtime.bag?.slots ?? []).filter(Boolean).length);
  return emptySlots >= Math.max(1, Math.trunc(Number(quantity) || 1));
}

function sharedLargeReward(runtime, quantity = 1) {
  const state = stateOf(runtime);
  ensureSafariEncounterSeed(state);
  return preflightSafariSharedLargeItemReward(
    runtime,
    state.day,
    (limit) => borrowSafariSharedRunRandomInt(runtime, limit),
    Math.max(1, Math.trunc(Number(quantity) || 1)),
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
  const owner = resolveBountyTarget({
    event,
    battle_outcome:victory ? 1 : 0,
    held_items:[],
  });
  const moneyOperation = operation(owner, "add_money");
  const rewardOperation = operation(owner, "grant_random");
  const clearBountyOperation = operation(owner, "clear_bounty");
  if (!clearBountyOperation) throw new Error("bounty_target canonical clear_bounty operation is required");
  if (victory && (!moneyOperation || rewardOperation?.tier !== "large")) {
    throw new Error("bounty_target canonical victory rewards are unresolved");
  }

  let reward = null;
  let receipt = null;
  if (victory) {
    reward = sharedLargeReward(runtime, rewardOperation.quantity);
    receipt = commitSafariBagEconomyReceipt(runtime, {
      reward,
      money:Number(moneyOperation.amount),
    });
    if (!receipt.success) throw new Error("bounty_target reward receipt could not be committed");
  }

  state.board_events[index] = owner.event;
  state.board_consumed[index] = Boolean(owner.event.normal_resolved);
  state.mapless_bounty = null;
  state.last_operations = [
    ...(owner.operations ?? []).filter((entry) => !["start_trainer_battle", "grant_random", "add_money"].includes(entry?.op)).map((entry) => structuredClone(entry)),
    ...(receipt?.operations ?? []),
    { op:"request_save", reason:"normal_event_post_battle" },
  ];
  state.notice = victory
    ? `賞金首を倒し、${Math.max(0, Math.trunc(Number(moneyOperation.amount) || 0))}円と報酬を受け取りました。`
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

  const victoryProjection = resolveBountyTarget({ event, battle_outcome:1, held_items:[] });
  const projectedReward = operation(victoryProjection, "grant_random");
  if (projectedReward?.tier !== "large") throw new Error("bounty_target canonical large reward projection is required");
  if (!hasGuaranteedLargeRewardCapacity(runtime, projectedReward.quantity)) {
    state.board_revealed[index] = true;
    state.notice = "賞金首を倒した後のcanonical報酬を確実に受け取れる空きがありません。バッグに空き枠を作ってください。";
    return {
      runtime,
      result:"reward_capacity_required",
      completed:false,
      operations:[{ op:"bounty_target_reward_capacity_required", required_empty_slots:Math.max(1, Math.trunc(Number(projectedReward.quantity) || 1)) }],
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
    payload:{ seed:Number(event.normal_data?.seed ?? 0) },
  });
  if (started.result === "normal_event_trainer_battle_started" && state.battle) globalThis.__maplessNormalEventUi = null;
  return started;
}
