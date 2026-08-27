import { add } from "./bag-economy-mart-flow.js";
import {
  MAPLESS_V108_TREASURE_CHEST_TIER_CONFIG,
  prepareMaplessV108TreasureChest,
  resolveMaplessV108TreasureChestReward,
} from "./mapless-v108-treasure-chest.js";

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}

function preparedTreasure(event) {
  return Boolean(event?.kind === "treasure"
    && event.chest_tier
    && Number.isInteger(event.chest_seed)
    && Number.isInteger(event.chest_generated_day));
}

// Compatibility export for callers/tests that need the canonical preparation owner.
// There is deliberately no day/index fallback: production hydration must supply RNG.
export function prepareSafariTreasureChestV108(event, { day, randomInt, forcedTier = null } = {}) {
  return prepareMaplessV108TreasureChest(event, { day, randomInt, forcedTier });
}

export function safariTreasureRewardV108(event, day) {
  return resolveMaplessV108TreasureChestReward(event, day);
}

function canGrantBag(runtime, reward) {
  const clone = (runtime.bag?.slots ?? []).map((slot) => slot ? [slot[0], slot[1]] : null);
  const maxSlots = Number(runtime.bag?.max_slots ?? runtime.bag?.maxSlots ?? 999);
  const maxPer = Number(runtime.bag?.max_per_slot ?? runtime.bag?.maxPerSlot ?? 999);
  return reward.items.every(({ itemId, quantity }) => add(clone, maxSlots, maxPer, itemId, quantity));
}

function grant(runtime, reward) {
  if (!canGrantBag(runtime, reward)) return false;
  const slots = runtime.bag.slots ?? (runtime.bag.slots = []);
  const maxSlots = Number(runtime.bag?.max_slots ?? runtime.bag?.maxSlots ?? 999);
  const maxPer = Number(runtime.bag?.max_per_slot ?? runtime.bag?.maxPerSlot ?? 999);
  for (const { itemId, quantity } of reward.items) {
    if (!add(slots, maxSlots, maxPer, itemId, quantity)) throw new Error(`treasure Bag grant failed for ${itemId}`);
  }
  runtime.bag.money = Math.max(0, Number(runtime.bag.money ?? 0) + reward.money);
  return true;
}

function hydrationMissing(runtime) {
  const state = stateOf(runtime);
  state.notice = "宝箱の生成データが未準備です。再抽選せずに処理を中止しました。";
  return {
    runtime,
    result:"treasure_hydration_missing",
    completed:false,
    consumed:false,
    operations:[],
    persistenceRequested:false,
    notice:state.notice,
  };
}

export function openSafariTreasureTouch(runtime, index) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "treasure") throw new Error("treasure board event is required");
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", operations:[] };
  if (!preparedTreasure(event)) return hydrationMissing(runtime);

  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  const config = MAPLESS_V108_TREASURE_CHEST_TIER_CONFIG[event.chest_tier];
  if (!config) return hydrationMissing(runtime);
  const name = config.name;
  state.notice = `${name}が置かれています。`;
  if (typeof globalThis.document !== "undefined") {
    globalThis.__maplessNormalEventUi = {
      runtime,
      boardIndex:index,
      eventId:"treasure_chest",
      title:name,
      message:state.notice,
      actions:[
        { id:"open", label:"宝箱を開ける" },
        { id:"leave", label:"立ち去る", secondary:true },
      ],
    };
  }
  return {
    runtime,
    result:"treasure_ready",
    boundary:"treasure",
    eventId:"treasure_chest",
    availableActions:["open","leave"],
    notice:state.notice,
    operations:[],
  };
}

export function resolveSafariTreasureChest(runtime, index, action) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "treasure") throw new Error("treasure board event is required");
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", completed:true, operations:[] };
  if (!preparedTreasure(event)) return hydrationMissing(runtime);

  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  if (action === "leave") {
    state.notice = "宝箱を開けずに立ち去りました。";
    return { runtime, result:"declined", completed:true, consumed:false, operations:[] };
  }
  if (action !== "open") throw new RangeError("treasure action must be open or leave");

  const reward = resolveMaplessV108TreasureChestReward(event, state.day);
  if (!grant(runtime, reward)) {
    state.notice = "バッグに空きがなく、宝箱の中身を受け取れませんでした。";
    return { runtime, result:"no_room", completed:true, consumed:false, reward, operations:[] };
  }
  state.board_consumed[index] = true;
  state.notice = `${reward.tierName}を開けました。`;
  state.last_operations = [
    { op:"treasure_reward", tier:reward.tier, money:reward.money, items:reward.items.map((entry) => ({ ...entry })) },
    { op:"request_save", reason:"treasure_opened" },
  ];
  return {
    runtime,
    result:"granted",
    completed:true,
    consumed:true,
    reward,
    persistenceRequested:true,
    notice:state.notice,
    operations:state.last_operations,
  };
}
