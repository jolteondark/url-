import { resolveRewardTransaction } from "./bag-economy-reward-transaction.js";
import { projectMaplessNormalEventOptionalReward } from "./mapless-normal-event-optional-reward.js";
import {
  MAPLESS_NORMAL_EVENT_MID_REWARD_ITEMS,
  pickMaplessNormalEventMediumRewards,
} from "./mapless-normal-event-medium-reward.js";
import {
  MAPLESS_NORMAL_EVENT_SMALL_REWARD_ITEMS,
  pickMaplessNormalEventSmallRewards,
} from "./mapless-normal-event-small-reward.js";
import { resolveLostPokemon } from "./mapless-normal-events-a2-flow.js";
import {
  resolveMaplessV108LostPokemonBerryThanks,
  resolveMaplessV108LostPokemonGiftRoll,
} from "./mapless-v108-lost-pokemon.js";
import { commitSafariBagEconomyReceipt } from "./safari-bag-economy-receipt.js";
import { borrowSafariSharedRunRandomInt, ensureSafariEncounterSeed } from "./safari-encounter-randomization.js";
import { registerSafariNormalEventBattleContinuation } from "./safari-normal-event-battle-continuation.js";
import { grantNormalEventPokemonFromPreparedEncounter } from "./safari-normal-event-pokemon-grant.js";
import { activateSafariNormalEventWildBattle } from "./safari-web-combat-start.js";

const MEDIUM_REWARD_META = Object.freeze(Object.fromEntries(
  [...MAPLESS_NORMAL_EVENT_SMALL_REWARD_ITEMS, ...MAPLESS_NORMAL_EVENT_MID_REWARD_ITEMS]
    .map((itemId) => [itemId, Object.freeze({ valid:true, pocket:"general" })]),
));
const SMALL_REWARD_META = Object.freeze(Object.fromEntries(
  MAPLESS_NORMAL_EVENT_SMALL_REWARD_ITEMS
    .map((itemId) => [itemId, Object.freeze({ valid:true, pocket:"general" })]),
));
const SAFARI_BAG_MAX_SLOTS = 20;
const SAFARI_BAG_MAX_PER_SLOT = 99;

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
function itemMeta(ids) {
  return Object.fromEntries([...new Set(ids)].map((id) => [id, { valid:true, pocket:"general" }]));
}
function rewardTransaction(runtime, items, costs = []) {
  if (items.length === 0 && costs.length === 0) return null;
  return resolveRewardTransaction({
    pockets:{ general:{ slots:bagSlots(runtime), maxSlots:SAFARI_BAG_MAX_SLOTS, maxPerSlot:SAFARI_BAG_MAX_PER_SLOT } },
    itemMeta:itemMeta([...items, ...costs.map((entry) => entry.item)]),
    items,
    costs,
  });
}
function searchBattleOperation(owner) {
  return (owner.operations ?? []).find((operation) => operation?.op === "start_wild_battle") ?? null;
}

export function safariLostPokemonBerryChoices(runtime) { return berryIds(runtime); }

registerSafariNormalEventBattleContinuation("lost_pokemon", (runtime, continuation) => {
  if (continuation.actionId !== "search") throw new Error(`unsupported lost_pokemon Battle continuation action: ${continuation.actionId}`);
  const state = stateOf(runtime);
  const index = Number(continuation.boardIndex);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "lost_pokemon") throw new Error("lost_pokemon continuation requires the originating board event");
  const owner = resolveLostPokemon({ event, action:"search" });
  state.board_events[index] = owner.event;
  state.board_consumed[index] = Boolean(owner.event.normal_resolved);
  state.last_operations = [
    ...(owner.operations ?? []).filter((operation) => operation?.op !== "start_wild_battle").map((operation) => structuredClone(operation)),
    { op:"request_save", reason:"normal_event_post_battle" },
  ];
  state.notice = "迷子のポケモンの親を探している途中で現れた野生ポケモンとの戦闘を終えました。";
  return { runtime, result:owner.outcome, completed:true, terminal:true, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
});

export async function resolveSafariLostPokemonInteraction(runtime, index, requestedAction) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "lost_pokemon") throw new Error("lost_pokemon board event is required");
  if (state.battle && !state.battle.completed) return { runtime, result:"battle_active", operations:[] };
  if (state.shop) return { runtime, result:"shop_active", operations:[] };
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", operations:[] };

  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  const raw = String(requestedAction ?? "");
  const berry = raw.startsWith("berry:") ? raw.slice(6) : null;
  const action = berry ? "berry" : raw;
  const availableActions = [...berryIds(runtime).map((id) => `berry:${id}`), "join", "search", "leave"];
  if (!availableActions.includes(raw)) return { runtime, result:"unsupported_action", completed:false, operations:[], availableActions };

  if (action === "join") {
    const preview = resolveLostPokemon({ event, action:"join", add_success:true });
    if (preview.outcome === "joined") {
      const preparedEncounter = event.normal_data?.lost_encounter;
      if (!preparedEncounter || typeof preparedEncounter !== "object" || Array.isArray(preparedEncounter)) {
        state.notice = "迷子のポケモンの遭遇個体データを読み込めませんでした。イベントは消費していません。";
        state.last_operations = [];
        return { runtime, result:"join_encounter_missing", completed:false, operations:[], notice:state.notice, persistenceRequested:false, availableActions };
      }
      const granted = grantNormalEventPokemonFromPreparedEncounter(runtime, preparedEncounter);
      if (!granted.success) {
        state.notice = "手持ちもボックスもいっぱいです。空きを作れば、このポケモンを仲間にできます。";
        state.last_operations = granted.operations.map((operation) => structuredClone(operation));
        return { runtime, result:"join_storage_full", completed:false, operations:state.last_operations, notice:state.notice, persistenceRequested:false, availableActions };
      }
      state.board_events[index] = preview.event;
      state.board_consumed[index] = Boolean(preview.event.normal_resolved);
      state.last_operations = [...preview.operations.map((operation) => structuredClone(operation)), ...granted.operations.map((operation) => structuredClone(operation))];
      state.notice = granted.result === "party" ? `${granted.pokemon.species}が仲間になりました。` : `${granted.pokemon.species}をボックスへ送りました。`;
      return { runtime, result:preview.outcome, completed:true, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner:preview };
    }
    state.board_events[index] = preview.event;
    state.board_consumed[index] = Boolean(preview.event.normal_resolved);
    state.last_operations = preview.operations.map((operation) => structuredClone(operation));
    state.notice = "迷子のポケモンは警戒していて、仲間にはなりませんでした。";
    return { runtime, result:preview.outcome, completed:true, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner:preview };
  }

  if (action === "search") {
    const preview = resolveLostPokemon({ event, action:"search" });
    const battleEvent = searchBattleOperation(preview);
    if (battleEvent) {
      const started = await activateSafariNormalEventWildBattle(runtime, index, {
        eventId:"lost_pokemon",
        actionId:"search",
        battleEvent,
        request:structuredClone(battleEvent),
        payload:{ search_roll:Number(event.normal_data?.search_roll) },
      });
      if (started.result === "normal_event_wild_battle_started" && state.battle) globalThis.__maplessNormalEventUi = null;
      return started;
    }
    let selectedMedium = { items:[], operations:[] };
    let sharedCounter = null;
    if (preview.outcome === "search_trainer_reward") {
      ensureSafariEncounterSeed(state);
      sharedCounter = Number(state.preview_encounter_counter ?? 0);
      selectedMedium = pickMaplessNormalEventMediumRewards({
        day:Math.max(1, Math.trunc(Number(state.day) || 1)),
        count:1,
        randomInt:(max) => borrowSafariSharedRunRandomInt(runtime, max),
        itemMeta:MEDIUM_REWARD_META,
      });
      if (!selectedMedium.items.length) {
        state.preview_encounter_counter = sharedCounter;
        state.notice = "お礼の道具候補を確定できませんでした。イベントと共有RNGは消費していません。";
        state.last_operations = [];
        return { runtime, result:"search_reward_empty", completed:false, operations:[], notice:state.notice, persistenceRequested:false, availableActions };
      }
    }
    const transaction = rewardTransaction(runtime, selectedMedium.items);
    const optionalReward = transaction
      ? projectMaplessNormalEventOptionalReward({ ownerResult:preview, rewardResult:transaction })
      : null;
    if (transaction && !transaction.success && sharedCounter !== null) state.preview_encounter_counter = sharedCounter;
    const receipt = transaction ? commitSafariBagEconomyReceipt(runtime, { reward:transaction }) : null;
    state.board_events[index] = preview.event;
    state.board_consumed[index] = Boolean(preview.event.normal_resolved);
    state.last_operations = [
      ...preview.operations.map((operation) => structuredClone(operation)),
      ...(receipt?.success ? selectedMedium.operations : []).map((operation) => structuredClone(operation)),
      ...(receipt?.operations ?? []).map((operation) => structuredClone(operation)),
    ];
    state.notice = preview.outcome === "search_trainer_reward"
      ? receipt?.success
        ? "飼い主を見つけ、お礼に道具を受け取りました。"
        : "飼い主を見つけましたが、バッグがいっぱいでお礼の道具は持ち帰れませんでした。"
      : "迷子のポケモンを親元へ返しました。";
    return { runtime, result:preview.outcome, completed:true, optionalReward, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner:preview };
  }

  if (action === "berry") {
    const giftRoll = event.normal_data?.gift_roll ?? resolveMaplessV108LostPokemonGiftRoll(event.normal_seed);
    const thanks = resolveMaplessV108LostPokemonBerryThanks(event.normal_seed, giftRoll);
    let selectedReward = { items:[...(thanks.items ?? [])], operations:[] };
    let sharedCounter = null;
    if (thanks.kind === "shared_small") {
      ensureSafariEncounterSeed(state);
      sharedCounter = Number(state.preview_encounter_counter ?? 0);
      selectedReward = pickMaplessNormalEventSmallRewards({
        count:1,
        randomInt:(max) => borrowSafariSharedRunRandomInt(runtime, max),
        itemMeta:SMALL_REWARD_META,
      });
    }
    if (!selectedReward.items.length) {
      if (sharedCounter !== null) state.preview_encounter_counter = sharedCounter;
      state.notice = "お礼の道具候補を確定できませんでした。きのみ・イベント・共有RNGは消費していません。";
      state.last_operations = [];
      return { runtime, result:"berry_reward_empty", completed:false, operations:[], notice:state.notice, persistenceRequested:false, availableActions };
    }
    const transaction = rewardTransaction(runtime, selectedReward.items, [{ item:berry, quantity:1 }]);
    if (!transaction?.success) {
      if (sharedCounter !== null) state.preview_encounter_counter = sharedCounter;
      state.notice = transaction?.result === "not_enough_items" ? "そのきのみを持っていません。" : "バッグにお礼の道具を入れる空きがありません。きのみ・共有RNGは消費していません。";
      state.last_operations = (transaction?.operations ?? []).map((operation) => structuredClone(operation));
      return { runtime, result:transaction?.result ?? "berry_failed", completed:false, operations:state.last_operations, notice:state.notice, persistenceRequested:false, availableActions };
    }
    const rareThanks = thanks.kind === "rare_item";
    const owner = resolveLostPokemon({
      event,
      action:"berry",
      berry,
      remove_success:true,
      rare_thanks:rareThanks,
      rare_reward_items:rareThanks ? selectedReward.items : undefined,
    });
    const receipt = commitSafariBagEconomyReceipt(runtime, { reward:transaction });
    if (!receipt.success) {
      if (sharedCounter !== null) state.preview_encounter_counter = sharedCounter;
      state.notice = "きのみとお礼の道具をバッグへ反映できませんでした。イベントと共有RNGは消費していません。";
      state.last_operations = receipt.operations.map((operation) => structuredClone(operation));
      return { runtime, result:receipt.result, completed:false, operations:state.last_operations, notice:state.notice, persistenceRequested:false, availableActions };
    }
    state.board_events[index] = owner.event;
    state.board_consumed[index] = Boolean(owner.event.normal_resolved);
    state.last_operations = [
      ...owner.operations.map((operation) => structuredClone(operation)),
      ...selectedReward.operations.map((operation) => structuredClone(operation)),
      ...receipt.operations.map((operation) => structuredClone(operation)),
    ];
    state.notice = rareThanks
      ? "きのみを渡すと、迷子のポケモンが珍しいきのみをお礼に残しました。"
      : "きのみを渡すと、迷子のポケモンがお礼の道具を残しました。";
    return { runtime, result:owner.outcome, completed:true, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
  }

  const owner = resolveLostPokemon({ event, action:"leave" });
  state.board_events[index] = owner.event;
  state.board_consumed[index] = Boolean(owner.event.normal_resolved);
  state.last_operations = owner.operations.map((operation) => structuredClone(operation));
  state.notice = "迷子のポケモンをその場に残して立ち去りました。";
  return { runtime, result:owner.outcome, completed:true, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
}
