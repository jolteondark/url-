import { resolveRewardTransaction } from "./bag-economy-reward-transaction.js";
import { resolveCanonicalNormalEvent } from "./mapless-canonical-normal-event-dispatcher.js";
import { RubyMT19937Random } from "./ruby-mt19937-random.js";
import { commitSafariBagEconomyReceipt } from "./safari-bag-economy-receipt.js";
import { pendingSafariNormalEventBattleContinuation, registerSafariNormalEventBattleContinuation } from "./safari-normal-event-battle-continuation.js";
import { resolveSafariTreasureChest } from "./safari-treasure-chest-interaction.js";
import { activateSafariNormalEventTrainerBattle } from "./safari-web-combat-start.js";

const BONUS_ITEMS = Object.freeze(["NUGGET", "STARPIECE", "COMETSHARD"]);
const BONUS_META = Object.freeze(Object.fromEntries(BONUS_ITEMS.map((id) => [id, Object.freeze({ valid:true, pocket:"general" })])));

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}
function resultEvent(runtime, index) {
  const event = stateOf(runtime).board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "treasure_map_result") throw new Error("treasure_map_result board event is required");
  return event;
}
function battleSucceeded(summary = {}) {
  const decision = Number(summary.decision);
  return decision === 1 || decision === 4;
}
function mapState(runtime, event) {
  const state = stateOf(runtime);
  const map = state.mapless_treasure_map;
  if (!map || typeof map !== "object" || Array.isArray(map)) throw new Error("treasure_map_result requires persisted treasure map state");
  return {
    fake:Boolean(map.fake),
    seed:Number(map.seed ?? event.normal_seed ?? 0) & 0x7fffffff,
    day:Math.max(1, Math.trunc(Number(state.day) || 1)),
  };
}
function battleRequest(owner) {
  const operation = (owner.operations ?? []).find((entry) => entry?.op === "start_trainer_battle");
  return operation?.request ? { ...operation.request } : null;
}
function chestIntent(owner) {
  return (owner.operations ?? []).find((entry) => entry?.op === "open_treasure_chest") ?? null;
}
function bonusReward(runtime, seed) {
  const rng = new RubyMT19937Random(Number(seed) & 0x7fffffff);
  const item = BONUS_ITEMS[rng.randInt(BONUS_ITEMS.length)];
  const bag = runtime.bag ?? {};
  const reward = resolveRewardTransaction({
    pockets:{ general:{ slots:bag.slots ?? [], maxSlots:Number(bag.max_slots ?? bag.maxSlots ?? 999), maxPerSlot:Number(bag.max_per_slot ?? bag.maxPerSlot ?? 999) } },
    itemMeta:BONUS_META,
    items:[item],
  });
  return { item, reward };
}
function commitBonus(runtime, projected) {
  if (!projected?.reward?.success) return [];
  const receipt = commitSafariBagEconomyReceipt(runtime, { reward:projected.reward });
  if (!receipt.success) throw new Error(`treasure map bonus commit failed: ${receipt.result}`);
  return (receipt.granted ?? []).map((entry) => ({ op:"runtime_grant_item", item:entry.item, quantity:entry.quantity }));
}
function commitResolvedResult(runtime, index, owner, applied = []) {
  const state = stateOf(runtime);
  const event = resultEvent(runtime, index);
  state.board_events[index] = { ...event, normal_resolved:true };
  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  state.board_consumed[index] = true;
  if ((owner.operations ?? []).some((operation) => operation?.op === "clear_treasure_map")) state.mapless_treasure_map = null;
  state.last_operations = [
    ...(owner.operations ?? []).filter((operation) => !["grant_items","open_treasure_chest"].includes(operation?.op)).map((operation) => structuredClone(operation)),
    ...applied,
    { op:"request_save", reason:"treasure_map_result_resolved" },
  ];
  return state.last_operations;
}
function resolveChestIntent(runtime, index, intent) {
  if (!intent) return { success:true, result:null, operations:[] };
  const state = stateOf(runtime);
  const original = state.board_events[index];
  state.board_events[index] = {
    kind:"treasure",
    chest_tier:String(intent.tier),
    chest_seed:Number(intent.options?.seed ?? 0) & 0x7fffffff,
    chest_generated_day:Math.max(1, Math.trunc(Number(intent.day) || Number(state.day) || 1)),
    source_name:intent.options?.source_name ?? null,
  };
  state.board_consumed[index] = false;
  const result = resolveSafariTreasureChest(runtime, index, "open");
  if (!result.consumed) {
    state.board_events[index] = original;
    state.board_consumed[index] = false;
    return { success:false, result, operations:result.operations ?? [] };
  }
  state.board_events[index] = original;
  state.board_consumed[index] = false;
  return { success:true, result, operations:result.operations ?? [] };
}

function finishAfterBattle(runtime, continuation) {
  if (continuation.actionId !== "open") throw new Error(`unsupported treasure_map_result Battle continuation action: ${continuation.actionId}`);
  const state = stateOf(runtime);
  const index = Number(continuation.boardIndex);
  const event = resultEvent(runtime, index);
  const map = mapState(runtime, event);
  const success = battleSucceeded(continuation.battleReturn);
  let projected = success ? bonusReward(runtime, map.seed) : null;
  let owner = resolveCanonicalNormalEvent("treasure_map_result", {
    event,
    fake:true,
    seed:map.seed,
    current_day:map.day,
    has_survival_state:true,
    battle_result:continuation.battleReturn,
    battle_success:success,
    existing_pool:BONUS_ITEMS,
    sampled_item:projected?.item ?? null,
    grant_items_result:projected?.reward?.success ?? false,
  });
  const applied = [];
  if (success) {
    const chest = resolveChestIntent(runtime, index, chestIntent(owner));
    if (!chest.success) {
      state.notice = "宝箱を受け取れる空きがありません。";
      return { runtime, result:"treasure_map_chest_no_room", completed:false, terminal:true, operations:chest.operations, notice:state.notice, owner };
    }
    projected = bonusReward(runtime, map.seed);
    owner = resolveCanonicalNormalEvent("treasure_map_result", {
      event,
      fake:true,
      seed:map.seed,
      current_day:map.day,
      has_survival_state:true,
      battle_result:continuation.battleReturn,
      battle_success:success,
      existing_pool:BONUS_ITEMS,
      sampled_item:projected.item,
      grant_items_result:projected.reward.success,
    });
    applied.push(...chest.operations.map((operation) => structuredClone(operation)), ...commitBonus(runtime, projected));
  }
  commitResolvedResult(runtime, index, owner, applied);
  state.notice = success ? "盗賊を退け、地図の宝を回収しました。" : "盗賊との勝負を終え、地図の探索は終了しました。";
  return { runtime, result:owner.result, completed:true, terminal:true, operations:state.last_operations, notice:state.notice, owner };
}

function retryCommittedPostBattleReward(runtime, index) {
  const checkpoint = pendingSafariNormalEventBattleContinuation(runtime);
  if (!checkpoint || checkpoint.committed !== true || checkpoint.event_id !== "treasure_map_result" || checkpoint.action_id !== "open") return null;
  if (Number(checkpoint.board_index) !== Number(index) || checkpoint.battle_returned !== true) return null;
  if (checkpoint.committed_result?.result !== "treasure_map_chest_no_room") return null;
  return finishAfterBattle(runtime, {
    key:checkpoint.key,
    day:checkpoint.day,
    boardIndex:checkpoint.board_index,
    eventId:checkpoint.event_id,
    actionId:checkpoint.action_id,
    request:checkpoint.request,
    payload:checkpoint.payload,
    battleReturn:checkpoint.battle_return,
  });
}

registerSafariNormalEventBattleContinuation("treasure_map_result", finishAfterBattle);

export async function activateSafariTreasureMapResult(runtime, index) {
  const state = stateOf(runtime);
  const event = resultEvent(runtime, index);
  if (state.battle && !state.battle.completed) return { runtime, result:"battle_active", completed:false, operations:[] };
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", completed:true, operations:[] };
  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  const map = mapState(runtime, event);

  if (map.fake) {
    const retry = retryCommittedPostBattleReward(runtime, index);
    if (retry) return retry;
    const preview = resolveCanonicalNormalEvent("treasure_map_result", { event, fake:true, seed:map.seed, current_day:map.day, has_survival_state:true, battle_success:false });
    const request = battleRequest(preview);
    if (!request) throw new Error("treasure_map_result fake route requires canonical trainer Battle request");
    return activateSafariNormalEventTrainerBattle(runtime, index, {
      eventId:"treasure_map_result",
      actionId:"open",
      battleEvent:request,
      request:structuredClone(request),
      payload:{ fake:true, seed:map.seed },
    });
  }

  const owner = resolveCanonicalNormalEvent("treasure_map_result", { event, fake:false, seed:map.seed, current_day:map.day, has_survival_state:true });
  const chest = resolveChestIntent(runtime, index, chestIntent(owner));
  if (!chest.success) {
    state.notice = "宝箱を受け取れる空きがありません。";
    return { runtime, result:"treasure_map_chest_no_room", completed:false, operations:chest.operations, notice:state.notice, owner };
  }
  commitResolvedResult(runtime, index, owner, chest.operations.map((operation) => structuredClone(operation)));
  state.notice = "地図に記された宝箱を回収しました。";
  return { runtime, result:owner.result, completed:true, operations:state.last_operations, notice:state.notice, owner };
}
