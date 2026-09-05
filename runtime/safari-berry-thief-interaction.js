import { resolveRewardTransaction } from "./bag-economy-reward-transaction.js";
import { resolveBerryThief } from "./mapless-normal-events-a3-flow.js";
import {
  MAPLESS_NORMAL_EVENT_SMALL_REWARD_ITEMS,
  resolveMaplessNormalEventSmallReward,
} from "./mapless-normal-event-small-reward.js";
import { MAPLESS_V108_RARE_BERRY_IDS } from "./mapless-v108-berry-catalog.js";
import { RubyMT19937Random } from "./ruby-mt19937-random.js";
import { commitSafariBagEconomyReceipt } from "./safari-bag-economy-receipt.js";
import { borrowSafariSharedRunRandomInt } from "./safari-encounter-randomization.js";
import { registerSafariNormalEventBattleContinuation } from "./safari-normal-event-battle-continuation.js";
import { grantNormalEventPokemonFromEncounter } from "./safari-normal-event-pokemon-grant.js";
import { activateSafariNormalEventWildBattle } from "./safari-web-combat-start.js";

const SAFARI_BAG_MAX_SLOTS = 20;
const SAFARI_BAG_MAX_PER_SLOT = 99;
const SMALL_ITEM_META = Object.freeze(Object.fromEntries(
  MAPLESS_NORMAL_EVENT_SMALL_REWARD_ITEMS.map((id) => [id, Object.freeze({ valid:true, pocket:"general" })]),
));

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}
function bagSlots(runtime) { return runtime.bag?.slots ?? []; }
function berryIds(runtime) {
  return [...new Set(bagSlots(runtime)
    .filter((slot) => Array.isArray(slot) && Number(slot[1]) > 0 && /BERRY$/i.test(String(slot[0] ?? "")))
    .map((slot) => String(slot[0])))];
}
function itemMeta(ids) { return Object.fromEntries([...new Set(ids)].map((id) => [id, { valid:true, pocket:"general" }])); }
function transaction(runtime, items = [], costs = []) {
  if (items.length === 0 && costs.length === 0) return null;
  return resolveRewardTransaction({
    pockets:{ general:{ slots:bagSlots(runtime), maxSlots:SAFARI_BAG_MAX_SLOTS, maxPerSlot:SAFARI_BAG_MAX_PER_SLOT } },
    itemMeta:itemMeta([...items, ...costs.map((entry) => entry.item)]),
    items,
    costs,
  });
}
function seededIndex(seed, poolLength) {
  const rng = new RubyMT19937Random(Number(seed) & 0x7fffffff);
  return rng.randInt(poolLength);
}
function hiddenRoll(event) {
  const rng = new RubyMT19937Random((Number(event.normal_seed) + 1) & 0x7fffffff);
  return rng.randInt(100);
}
function reserveHiddenSmallReward(runtime) {
  const reservation = resolveMaplessNormalEventSmallReward({
    count:1,
    randomInt:(max) => borrowSafariSharedRunRandomInt(runtime, max),
    itemMeta:SMALL_ITEM_META,
    pockets:{ general:{ slots:[], maxSlots:SAFARI_BAG_MAX_SLOTS, maxPerSlot:SAFARI_BAG_MAX_PER_SLOT } },
  });
  const item = reservation?.selectedItems?.[0] ?? null;
  if (!reservation?.success || !item) throw new Error("berry_thief hidden small reward selection failed");
  return { item, operations:(reservation.operations ?? []).map((operation) => structuredClone(operation)) };
}
function battleOperation(owner) { return (owner.operations ?? []).find((operation) => operation?.op === "start_wild_battle") ?? null; }
function battleSucceeded(summary={}) { const decision=Number(summary.decision); return decision===1 || decision===4; }

export function safariBerryThiefBerryChoices(runtime) { return berryIds(runtime); }

function applyInitialTheft(runtime, index) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (event?.normal_data?.stolen_applied === true) return { changed:false, operations:[] };
  const requested = [...(event?.normal_data?.stolen ?? [])];
  const results = {};
  const operations = [];
  for (const item of requested) {
    const resolved = transaction(runtime, [], [{ item, quantity:1 }]);
    const ok = resolved?.success === true;
    results[item] = ok;
    if (resolved) {
      const receipt = ok ? commitSafariBagEconomyReceipt(runtime, { reward:resolved }) : null;
      operations.push(...(receipt?.operations ?? resolved.operations ?? []).map((operation) => structuredClone(operation)));
    }
  }
  const owner = resolveBerryThief({ event, action:null, stolen_remove_results:results });
  state.board_events[index] = owner.event;
  operations.push(...(owner.operations ?? []).filter((operation) => operation?.op !== "present_choices" && operation?.op !== "remove_item").map((operation) => structuredClone(operation)));
  operations.push({ op:"request_save", reason:"berry_thief_initial_theft" });
  state.last_operations = operations;
  return { changed:true, operations, owner };
}

registerSafariNormalEventBattleContinuation("berry_thief", (runtime, continuation) => {
  const state = stateOf(runtime);
  const index = Number(continuation.boardIndex);
  const event = state.board_events?.[index];
  if (!event || event.normal_event_id !== "berry_thief") throw new Error("berry_thief continuation requires originating event");
  const success = battleSucceeded(continuation.battleReturn);
  const restored = success ? [...(event.normal_data?.stolen ?? [])] : [];
  const roll = Number.isFinite(Number(continuation.payload?.hidden_reward_roll))
    ? Number(continuation.payload.hidden_reward_roll)
    : hiddenRoll(event);
  const bonusEligible = success && continuation.actionId === "chase" && roll < 20;
  const bonusItem = bonusEligible ? String(continuation.payload?.hidden_reward_item ?? "") : "";
  if (bonusEligible && !bonusItem) throw new Error("berry_thief hidden small reward reservation is missing");
  const rewards = [...restored, ...(bonusItem ? [bonusItem] : [])];
  const resolved = rewards.length ? transaction(runtime, rewards) : null;
  if (resolved && !resolved.success) throw new Error("berry_thief post-battle rewards no longer fit in Bag");
  const owner = resolveBerryThief({
    event,
    action:continuation.actionId,
    berry:continuation.payload?.berry ?? null,
    berry_remove_success:continuation.actionId === "bait" ? true : undefined,
    battle_success:success,
    hidden_reward_roll:roll,
  });

  const receipt = resolved ? commitSafariBagEconomyReceipt(runtime, { reward:resolved }) : null;
  state.board_events[index] = owner.event;
  state.board_consumed[index] = Boolean(owner.event.normal_resolved);
  state.last_operations = [
    ...(owner.operations ?? []).filter((operation) => !["start_wild_battle","grant_items","remove_item"].includes(operation?.op)).map((operation) => structuredClone(operation)),
    ...(receipt?.operations ?? []).map((operation) => structuredClone(operation)),
    { op:"request_save", reason:"normal_event_post_battle" },
  ];
  state.notice = success
    ? bonusItem
      ? `きのみ泥棒を追い払い、盗まれた道具を取り戻しました。さらに${bonusItem}を見つけました。`
      : "きのみ泥棒を追い払い、盗まれた道具を取り戻しました。"
    : "きのみ泥棒との戦いは終わりました。";
  const bonus = bonusItem ? { success:true, selectedItems:[bonusItem] } : null;
  return { runtime, result:owner.outcome, completed:true, terminal:true, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner, bonus };
});

export async function resolveSafariBerryThiefInteraction(runtime, index, requestedAction) {
  const state = stateOf(runtime);
  let event = state.board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "berry_thief") throw new Error("berry_thief board event is required");
  if (state.battle && !state.battle.completed) return { runtime, result:"battle_active", operations:[] };
  if (state.shop) return { runtime, result:"shop_active", operations:[] };
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", operations:[] };
  state.board_revealed[index] = true;
  state.board_visited[index] = true;

  const theft = applyInitialTheft(runtime, index);
  event = state.board_events[index];
  const raw = String(requestedAction ?? "");
  const berry = raw.startsWith("bait:") ? raw.slice(5) : null;
  const action = berry ? "bait" : raw;
  const availableActions = [...berryIds(runtime).map((item) => `bait:${item}`), "chase", "leave"];
  if (!availableActions.includes(raw)) return { runtime, result:"unsupported_action", completed:false, operations:theft.operations, availableActions, persistenceRequested:theft.changed };

  if (action === "chase" || action === "bait") {
    const roll = hiddenRoll(event);
    const preview = resolveBerryThief({ event, action, berry, berry_remove_success:action === "bait" ? true : undefined, battle_success:false, hidden_reward_roll:roll });
    const battleEvent = battleOperation(preview);
    if (!battleEvent) throw new Error("berry_thief battle route did not request Battle");
    const possibleRewards = [...(event.normal_data?.stolen ?? [])];
    if (action === "bait") {
      const preflight = transaction(runtime, possibleRewards, [{ item:berry, quantity:1 }]);
      if (!preflight?.success) {
        state.notice = preflight?.result === "not_enough_items" ? "そのきのみを持っていません。" : "戦闘後に盗品を戻すバッグの空きがありません。きのみは消費していません。";
        return { runtime, result:preflight?.result ?? "bait_failed", completed:false, operations:[...theft.operations, ...(preflight?.operations ?? [])], notice:state.notice, persistenceRequested:theft.changed, availableActions };
      }
      const debit = transaction(runtime, [], [{ item:berry, quantity:1 }]);
      const receipt = commitSafariBagEconomyReceipt(runtime, { reward:debit });
      state.last_operations = [...theft.operations, ...receipt.operations.map((operation) => structuredClone(operation)), { op:"request_save", reason:"berry_thief_bait_committed" }];
    } else {
      const preflight = possibleRewards.length ? transaction(runtime, possibleRewards) : null;
      if (preflight && !preflight.success) {
        state.notice = "戦闘後に盗品を戻すバッグの空きがありません。バッグを空けてから追ってください。";
        return { runtime, result:"reward_bag_full", completed:false, operations:[...theft.operations, ...preflight.operations], notice:state.notice, persistenceRequested:theft.changed, availableActions };
      }
    }

    const hiddenReward = action === "chase" && roll < 20 ? reserveHiddenSmallReward(runtime) : null;
    const started = await activateSafariNormalEventWildBattle(runtime, index, {
      eventId:"berry_thief",
      actionId:action,
      battleEvent,
      request:structuredClone(battleEvent),
      payload:{ berry, hidden_reward_roll:roll, hidden_reward_item:hiddenReward?.item ?? null },
    });
    if (started.result === "normal_event_wild_battle_started" && state.battle) globalThis.__maplessNormalEventUi = null;
    return {
      ...started,
      persistenceRequested:true,
      operations:[
        ...theft.operations,
        ...(hiddenReward?.operations ?? []),
        ...(state.last_operations ?? started.operations ?? []),
        { op:"request_save", reason:"berry_thief_battle_started" },
      ],
    };
  }

  const rareBerry = MAPLESS_V108_RARE_BERRY_IDS[seededIndex(event.normal_seed, MAPLESS_V108_RARE_BERRY_IDS.length)];
  const owner = resolveBerryThief({ event, action:"leave", rare_berry:rareBerry });
  if (owner.outcome === "leave_join") {
    const granted = await grantNormalEventPokemonFromEncounter(runtime, { type:event.normal_data?.type, modifier:-2, seed:Number(event.normal_seed) & 0x7fffffff });
    if (!granted.success) {
      state.notice = "手持ちもボックスもいっぱいです。空きを作れば、きのみ泥棒を仲間にできます。";
      return { runtime, result:"leave_join_storage_full", completed:false, operations:[...theft.operations, ...(granted.operations ?? [])], notice:state.notice, persistenceRequested:theft.changed, availableActions };
    }
    state.board_events[index] = owner.event;
    state.board_consumed[index] = true;
    state.last_operations = [...theft.operations, ...owner.operations.map((operation) => structuredClone(operation)), ...(granted.operations ?? []).map((operation) => structuredClone(operation))];
    state.notice = granted.result === "party" ? `${granted.pokemon.species}が仲間になりました。` : `${granted.pokemon.species}をボックスへ送りました。`;
    return { runtime, result:owner.outcome, completed:true, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
  }
  if (owner.outcome === "leave_rare_berry") {
    const resolved = transaction(runtime, [rareBerry]);
    if (!resolved?.success) {
      state.notice = `${rareBerry}を受け取る空きがありません。イベントはまだ完了していません。`;
      return { runtime, result:"reward_bag_full", completed:false, operations:[...theft.operations, ...(resolved?.operations ?? [])], notice:state.notice, persistenceRequested:theft.changed, availableActions };
    }
    const receipt = commitSafariBagEconomyReceipt(runtime, { reward:resolved });
    state.board_events[index] = owner.event;
    state.board_consumed[index] = true;
    state.last_operations = [...theft.operations, ...owner.operations.filter((operation) => operation?.op !== "grant_items").map((operation) => structuredClone(operation)), ...receipt.operations.map((operation) => structuredClone(operation))];
    state.notice = `立ち去ろうとすると、${rareBerry}を見つけました。`;
    return { runtime, result:owner.outcome, completed:true, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
  }
  state.board_events[index] = owner.event;
  state.board_consumed[index] = true;
  state.last_operations = [...theft.operations, ...owner.operations.map((operation) => structuredClone(operation))];
  state.notice = "きのみ泥棒を見送りました。盗まれた道具は戻りませんでした。";
  return { runtime, result:owner.outcome, completed:true, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
}
