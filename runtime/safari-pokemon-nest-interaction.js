import { resolveRewardTransaction } from "./bag-economy-reward-transaction.js";
import { resolvePokemonNest } from "./mapless-normal-events-a3-flow.js";
import { RubyMT19937Random } from "./ruby-mt19937-random.js";
import { registerSafariNormalEventBattleContinuation } from "./safari-normal-event-battle-continuation.js";
import { grantSafariNormalEventPartyExp } from "./safari-normal-event-exp-owner.js";
import { grantNormalEventHiddenEgg } from "./safari-normal-event-pokemon-grant.js";
import { activateSafariNormalEventWildBattle } from "./safari-web-combat-start.js";

const LOW_ITEMS = Object.freeze([
  "POTION", "ANTIDOTE", "PARALYZEHEAL", "AWAKENING", "BURNHEAL", "ICEHEAL",
  "POKEBALL", "ORANBERRY", "PECHABERRY", "CHERIBERRY", "FRESHWATER", "SODAPOP",
]);
const SAFARI_BAG_MAX_SLOTS = 20;
const SAFARI_BAG_MAX_PER_SLOT = 99;
const ITEM_META = Object.freeze(Object.fromEntries(
  LOW_ITEMS.map((itemId) => [itemId, Object.freeze({ valid:true, pocket:"general" })]),
));

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}

function eventOf(runtime, index) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "pokemon_nest") {
    throw new Error("pokemon_nest board event is required");
  }
  return event;
}

function battleOperation(owner) {
  return (owner.operations ?? []).find((operation) => operation?.op === "start_wild_battle") ?? null;
}

function battleSucceeded(summary = {}) {
  const decision = Number(summary.decision);
  return decision === 1 || decision === 4;
}

function rewardItem(event) {
  const rng = new RubyMT19937Random((Number(event.normal_seed) ^ 0x4e455354) & 0x7fffffff);
  return LOW_ITEMS[rng.randInt(LOW_ITEMS.length)];
}

function rewardTransaction(runtime, items) {
  if (items.length === 0) return null;
  return resolveRewardTransaction({
    pockets:{ general:{ slots:runtime.bag?.slots ?? [], maxSlots:SAFARI_BAG_MAX_SLOTS, maxPerSlot:SAFARI_BAG_MAX_PER_SLOT } },
    itemMeta:ITEM_META,
    items,
  });
}

function applyReward(runtime, transaction) {
  if (!transaction?.success) return [];
  runtime.bag ??= { slots:[], money:0 };
  runtime.bag.slots = transaction.pockets.general.slots.filter(Boolean);
  return transaction.granted.map((entry) => ({ op:"runtime_grant_item", item:entry.item, quantity:entry.quantity }));
}

function commitOwner(state, index, owner, extraOperations = []) {
  state.board_events[index] = owner.event;
  state.board_consumed[index] = Boolean(owner.event.normal_resolved);
  state.last_operations = [
    ...(owner.operations ?? []).filter((operation) => operation?.op !== "start_wild_battle").map((operation) => structuredClone(operation)),
    ...extraOperations.map((operation) => structuredClone(operation)),
  ];
}

registerSafariNormalEventBattleContinuation("pokemon_nest", (runtime, continuation) => {
  const state = stateOf(runtime);
  const index = Number(continuation.boardIndex);
  const event = eventOf(runtime, index);
  const success = battleSucceeded(continuation.battleReturn);

  if (continuation.actionId === "search") {
    const owner = resolvePokemonNest({
      event,
      action:"search",
      current_day:state.day,
      battle_success:success,
      search_reward_item:rewardItem(event),
    });
    commitOwner(state, index, owner, [{ op:"request_save", reason:"normal_event_post_battle" }]);
    state.notice = success
      ? "巣を調べている途中で現れた野生ポケモンを退けました。"
      : "巣を調べている途中で現れた野生ポケモンから離れました。";
    return {
      runtime,
      result:owner.outcome,
      completed:true,
      terminal:true,
      operations:state.last_operations,
      notice:state.notice,
      persistenceRequested:true,
      owner,
    };
  }

  if (continuation.actionId === "egg") {
    if (!success) {
      const owner = resolvePokemonNest({ event, action:"egg", current_day:state.day, battle_success:false });
      commitOwner(state, index, owner, [{ op:"request_save", reason:"normal_event_post_battle" }]);
      state.notice = "タマゴを守っていた野生ポケモンとの戦闘を終えました。";
      return {
        runtime,
        result:owner.outcome,
        completed:true,
        terminal:true,
        operations:state.last_operations,
        notice:state.notice,
        persistenceRequested:true,
        owner,
      };
    }

    const granted = grantNormalEventHiddenEgg(runtime, {
      type:String(event.normal_data?.type ?? ""),
      seed:Number(event.normal_seed ?? 0) + 1,
    });
    if (!granted.success) {
      state.notice = "手持ちもボックスもいっぱいです。空きを作れば、巣のタマゴを保護できます。";
      state.last_operations = [
        ...(granted.operations ?? []).map((operation) => structuredClone(operation)),
        { op:"request_save", reason:"normal_event_post_battle_capacity" },
      ];
      return {
        runtime,
        result:"egg_storage_full",
        completed:false,
        terminal:true,
        operations:state.last_operations,
        notice:state.notice,
        persistenceRequested:true,
      };
    }

    const owner = resolvePokemonNest({
      event,
      action:"egg",
      current_day:state.day,
      battle_success:true,
      add_egg_success:true,
    });
    commitOwner(state, index, owner, [
      ...(granted.operations ?? []),
      { op:"request_save", reason:"normal_event_post_battle" },
    ]);
    state.notice = granted.result === "party"
      ? "巣のタマゴを保護し、手持ちに加えました。"
      : "巣のタマゴを保護し、ボックスへ送りました。";
    return {
      runtime,
      result:owner.outcome,
      completed:true,
      terminal:true,
      operations:state.last_operations,
      notice:state.notice,
      persistenceRequested:true,
      owner,
      granted,
    };
  }

  throw new Error(`unsupported pokemon_nest Battle continuation action: ${continuation.actionId}`);
});

export async function resolveSafariPokemonNestInteraction(runtime, index, requestedAction) {
  const state = stateOf(runtime);
  const event = eventOf(runtime, index);
  if (state.battle && !state.battle.completed) return { runtime, result:"battle_active", operations:[] };
  if (state.shop) return { runtime, result:"shop_active", operations:[] };
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", operations:[] };

  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  const action = String(requestedAction ?? "");
  const availableActions = ["observe", "search", "egg"];
  if (!availableActions.includes(action)) {
    return { runtime, result:"unsupported_action", completed:false, operations:[], availableActions };
  }

  if (action === "observe") {
    const owner = resolvePokemonNest({ event, action:"observe", current_day:state.day });
    const expOperation = (owner.operations ?? []).find((operation) => operation?.op === "gain_party_exp");
    if (!expOperation) throw new Error("pokemon_nest observe requires canonical Party EXP operation");
    const granted = await grantSafariNormalEventPartyExp(runtime, Number(expOperation.amount));
    commitOwner(state, index, owner, granted.operations ?? []);
    state.notice = `巣を観察し、手持ちのポケモンがそれぞれ${Number(expOperation.amount)}EXPを得ました。`;
    return {
      runtime,
      result:owner.outcome,
      completed:true,
      operations:state.last_operations,
      notice:state.notice,
      persistenceRequested:true,
      owner,
      granted,
    };
  }

  if (action === "search") {
    const item = rewardItem(event);
    const owner = resolvePokemonNest({
      event,
      action:"search",
      current_day:state.day,
      battle_success:false,
      search_reward_item:item,
    });
    const battleEvent = battleOperation(owner);
    if (battleEvent) {
      const started = await activateSafariNormalEventWildBattle(runtime, index, {
        eventId:"pokemon_nest",
        actionId:"search",
        battleEvent,
        request:structuredClone(battleEvent),
        payload:{ search_roll:Number(event.normal_data?.search_roll) },
      });
      if (started.result === "normal_event_wild_battle_started" && state.battle) globalThis.__maplessNormalEventUi = null;
      return started;
    }

    const rewards = owner.outcome === "search_reward" ? [item] : [];
    const transaction = rewardTransaction(runtime, rewards);
    if (transaction && !transaction.success) {
      state.notice = "バッグに巣で見つけた道具を入れる空きがありません。巣はまだ探索できます。";
      state.last_operations = transaction.operations.map((operation) => structuredClone(operation));
      return {
        runtime,
        result:"reward_bag_full",
        completed:false,
        operations:state.last_operations,
        notice:state.notice,
        persistenceRequested:false,
        availableActions,
      };
    }
    const applied = applyReward(runtime, transaction);
    commitOwner(state, index, owner, [
      ...(transaction?.operations ?? []),
      ...applied,
    ]);
    state.notice = owner.outcome === "search_reward"
      ? "巣を調べて道具を見つけました。"
      : "巣を調べましたが、何も見つかりませんでした。";
    return {
      runtime,
      result:owner.outcome,
      completed:true,
      operations:state.last_operations,
      notice:state.notice,
      persistenceRequested:true,
      owner,
    };
  }

  const owner = resolvePokemonNest({ event, action:"egg", current_day:state.day, battle_success:false });
  const battleEvent = battleOperation(owner);
  if (!battleEvent) throw new Error("pokemon_nest egg route requires canonical Battle request");
  const started = await activateSafariNormalEventWildBattle(runtime, index, {
    eventId:"pokemon_nest",
    actionId:"egg",
    battleEvent,
    request:structuredClone(battleEvent),
    payload:{ egg_type:String(event.normal_data?.type ?? ""), egg_seed:Number(event.normal_seed ?? 0) + 1 },
  });
  if (started.result === "normal_event_wild_battle_started" && state.battle) globalThis.__maplessNormalEventUi = null;
  return started;
}
