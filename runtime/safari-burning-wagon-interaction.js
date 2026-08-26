import { resolveRewardTransaction } from "./bag-economy-reward-transaction.js";
import { resolveBurningWagon } from "./mapless-normal-events-a1-flow.js";
import { ensureMaplessRunLifecycleState, finishMaplessRun, maplessPartyAllFainted } from "./mapless-run-end-lifecycle.js";
import { updatePokemonRuntime } from "./pokemon-runtime.js";
import { RubyMT19937Random } from "./ruby-mt19937-random.js";
import { borrowSafariSharedRunRandomInt, ensureSafariEncounterSeed } from "./safari-encounter-randomization.js";
import { inflictSafariOverworldStatus } from "./safari-pokemon-healing.js";
import { hasSafariUsablePartyType, safariPokemonTypes } from "./safari-pokemon-type-membership.js";
import { applySafariSmallItemReward, preflightSafariSharedSmallItemReward } from "./safari-small-item-reward.js";

const LOW_ITEMS = Object.freeze([
  "POTION", "ANTIDOTE", "PARALYZEHEAL", "AWAKENING", "BURNHEAL", "ICEHEAL",
  "POKEBALL", "ORANBERRY", "PECHABERRY", "CHERIBERRY", "FRESHWATER", "SODAPOP",
]);
const SAFARI_BAG_MAX_SLOTS = 20;
const SAFARI_BAG_MAX_PER_SLOT = 99;
const SAFARI_REWARD_ITEM_META = Object.freeze(Object.fromEntries(
  LOW_ITEMS.map((itemId) => [itemId, Object.freeze({ valid:true, pocket:"general" })]),
));

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}
function usable(pokemon) { return Boolean(pokemon) && Number(pokemon.hp ?? 0) > 0 && pokemon.egg !== true; }
function party(runtime) { return runtime.player?.party ?? []; }
function hasType(runtime, typeId) { return hasSafariUsablePartyType(runtime, typeId); }
function firstUsableOfType(runtime, typeId) {
  const wanted = String(typeId).toUpperCase();
  return party(runtime).find((pokemon) => usable(pokemon) && safariPokemonTypes(pokemon).includes(wanted)) ?? null;
}
function firstUsableIndex(runtime) { return party(runtime).findIndex((pokemon) => usable(pokemon)); }
function deterministicItems(event, salt, count) {
  const rng = new RubyMT19937Random((Number(event.normal_seed) ^ salt) & 0x7fffffff);
  return Array.from({ length:count }, () => LOW_ITEMS[rng.randInt(LOW_ITEMS.length)]);
}
function rewardPlan(event, action) {
  if (action === "water") {
    const rng = new RubyMT19937Random((Number(event.normal_seed) ^ 0xb17a5e) & 0x7fffffff);
    return deterministicItems(event, 0xb17a5e, 2 + rng.randInt(2));
  }
  if (action === "fire") return deterministicItems(event, 0xf1ae11, 1);
  return [];
}
function preflightReward(runtime, items) {
  if (items.length === 0) return null;
  return resolveRewardTransaction({
    pockets:{ general:{ slots:runtime.bag?.slots ?? [], maxSlots:SAFARI_BAG_MAX_SLOTS, maxPerSlot:SAFARI_BAG_MAX_PER_SLOT } },
    itemMeta:SAFARI_REWARD_ITEM_META,
    items,
  });
}
function preflightManualSharedReward(runtime) {
  const state = stateOf(runtime);
  ensureSafariEncounterSeed(state);
  const counter = state.preview_encounter_counter;
  const reward = preflightSafariSharedSmallItemReward(
    runtime,
    (limit) => borrowSafariSharedRunRandomInt(runtime, limit),
    1,
  );
  if (!reward.success) state.preview_encounter_counter = counter;
  return { reward, counter };
}
function applyFlatDamage(runtime, index, amount) {
  const pokemon = party(runtime)[index];
  if (!usable(pokemon)) return false;
  const hp = Math.max(0, Math.trunc(Number(pokemon.hp ?? 0)) - Math.max(0, Math.trunc(Number(amount) || 0)));
  party(runtime)[index] = updatePokemonRuntime(pokemon, { hp });
  return true;
}
function finishPartyWipe(runtime) {
  const state = ensureMaplessRunLifecycleState(runtime);
  if (!state.mapless_run_active || !maplessPartyAllFainted(party(runtime))) return { finished:false, overflow:false, operations:[] };
  state.mapless_run_end_pending = true;
  const finished = finishMaplessRun(runtime);
  state.location = "home";
  return {
    ...finished,
    operations:[
      { op:"mark_run_end", reason:"party_wipe", source:"normal_event:burning_wagon" },
      ...(finished.operations ?? []),
      { op:"return_to_home", source:"normal_event:burning_wagon" },
    ],
  };
}

export function resolveSafariBurningWagonInteraction(runtime, index, action) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "burning_wagon") throw new Error("burning_wagon board event is required");
  if (state.battle && !state.battle.completed) return { runtime, result:"battle_active", operations:[] };
  if (state.shop) return { runtime, result:"shop_active", operations:[] };
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", operations:[] };

  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  const availableActions = [
    ...(hasType(runtime, "WATER") ? ["water"] : []),
    ...(hasType(runtime, "FIRE") ? ["fire"] : []),
    "manual",
    "leave",
  ];
  if (!availableActions.includes(action)) return { runtime, result:"unsupported_action", completed:false, operations:[], availableActions };

  const manualRoll = Number(event.normal_data?.manual_roll);
  const usesSharedManualReward = action === "manual" && Number.isInteger(manualRoll) && manualRoll >= 60 && manualRoll < 85;
  let manualSharedReward = null;
  if (usesSharedManualReward) {
    manualSharedReward = preflightManualSharedReward(runtime).reward;
    if (!manualSharedReward.success) {
      state.notice = "バッグに救助報酬を入れる空きがありません。荷馬車にはまだ手を付けていません。";
      state.last_operations = manualSharedReward.operations.map((operation) => structuredClone(operation));
      return { runtime, result:"reward_bag_full", completed:false, operations:state.last_operations, notice:state.notice, persistenceRequested:false, availableActions };
    }
  }

  const rewardItems = rewardPlan(event, action);
  const reward = preflightReward(runtime, rewardItems);
  if (reward && !reward.success) {
    state.notice = "バッグに救助報酬をすべて入れる空きがありません。荷馬車にはまだ手を付けていません。";
    state.last_operations = reward.operations.map((operation) => structuredClone(operation));
    return { runtime, result:"reward_bag_full", completed:false, operations:state.last_operations, notice:state.notice, persistenceRequested:false, availableActions };
  }

  const preparedEvent = action === "fire" && rewardItems.length > 0
    ? { ...event, normal_data:{ ...(event.normal_data ?? {}), fire_choices:[...rewardItems] } }
    : event;
  const owner = resolveBurningWagon({
    event:preparedEvent,
    action,
    has_water:hasType(runtime, "WATER"),
    has_fire:hasType(runtime, "FIRE"),
    chosen_pokemon:action === "water" ? firstUsableOfType(runtime, "WATER") : action === "fire" ? firstUsableOfType(runtime, "FIRE") : null,
    reward_items:action === "water" ? rewardItems : undefined,
    fire_choice:action === "fire" ? rewardItems[0] : undefined,
  });

  const applied = [];
  const targetIndex = firstUsableIndex(runtime);
  for (const operation of owner.operations ?? []) {
    if (operation.op === "damage_pokemon" && targetIndex >= 0) {
      if (applyFlatDamage(runtime, targetIndex, operation.amount)) applied.push({ op:"runtime_damage_pokemon", party_index:targetIndex, amount:Number(operation.amount) });
    } else if (operation.op === "inflict_status" && targetIndex >= 0 && Number(party(runtime)[targetIndex]?.hp ?? 0) > 0) {
      party(runtime)[targetIndex] = inflictSafariOverworldStatus(party(runtime)[targetIndex], operation.status);
      applied.push({ op:"runtime_inflict_status", party_index:targetIndex, status:operation.status });
    }
  }
  if (manualSharedReward?.success) {
    applied.push(...applySafariSmallItemReward(runtime, manualSharedReward));
  }
  if (reward?.success) {
    runtime.bag.slots = reward.pockets.general.slots.filter(Boolean);
    applied.push(...reward.granted.map((entry) => ({ op:"runtime_grant_item", item:entry.item, quantity:entry.quantity })));
  }

  state.board_events[index] = owner.event;
  state.board_consumed[index] = Boolean(owner.event.normal_resolved);
  const eventOperations = [
    ...(owner.operations ?? []).map((operation) => structuredClone(operation)),
    ...(manualSharedReward?.operations ?? []).map((operation) => structuredClone(operation)),
    ...(reward?.operations ?? []).map((operation) => structuredClone(operation)),
    ...applied,
  ];
  state.last_operations = eventOperations;
  state.notice = owner.outcome === "left"
    ? "燃える荷馬車を離れました。"
    : owner.outcome === "water_rescue"
      ? "みずタイプが火を消し、救助のお礼に道具を受け取りました。"
      : owner.outcome === "fire_rescue_reward"
        ? "ほのおタイプが延焼を制御し、救助のお礼に道具を受け取りました。"
        : owner.outcome === "fire_rescue_no_reward"
          ? "ほのおタイプが延焼を制御し、荷馬車を救いました。"
          : owner.outcome === "manual_rescue_reward"
            ? "荷馬車を救い、持ち主から道具を受け取りました。"
            : owner.outcome === "manual_rescue_injured"
              ? "荷馬車は救えましたが、先頭のポケモンが20ダメージを受けました。"
              : "救助中に先頭のポケモンが20ダメージを受け、やけどしました。";

  const runEnd = owner.result && owner.operations?.some((operation) => operation.op === "damage_pokemon")
    ? finishPartyWipe(runtime)
    : { finished:false, overflow:false, operations:[] };
  if (runEnd.finished) {
    state.notice = "荷馬車の救助で手持ちが全滅したため、今回のランは終了しました。";
    state.last_operations = [...eventOperations, ...(runEnd.operations ?? [])];
  }

  return {
    runtime,
    result:owner.outcome,
    completed:Boolean(owner.result),
    operations:state.last_operations,
    notice:state.notice,
    persistenceRequested:Boolean(owner.result) || runEnd.finished,
    owner,
    runEnd,
  };
}
