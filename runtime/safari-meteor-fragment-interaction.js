import { resolveRewardTransaction } from "./bag-economy-reward-transaction.js";
import { resolveMeteorFragment } from "./mapless-normal-events-a2-flow.js";
import {
  MAPLESS_NORMAL_EVENT_LARGE_REWARD_ITEMS,
  resolveMaplessNormalEventLargeReward,
} from "./mapless-normal-event-large-reward.js";
import { MAPLESS_NORMAL_EVENT_MID_REWARD_ITEMS } from "./mapless-normal-event-medium-reward.js";
import {
  hydrateMaplessV108MeteorFragmentFixedData,
  resolveMaplessV108MeteorFragmentReward,
} from "./mapless-v108-meteor-fragment.js";
import { updatePokemonRuntime } from "./pokemon-runtime.js";
import { borrowSafariSharedRunRandomInt, ensureSafariEncounterSeed } from "./safari-encounter-randomization.js";
import { hasSafariUsablePartyType, safariPokemonTypes } from "./safari-pokemon-type-membership.js";

const SAFARI_BAG_MAX_SLOTS = 20;
const SAFARI_BAG_MAX_PER_SLOT = 99;
const LARGE_ITEM_META = Object.freeze(Object.fromEntries(
  [...MAPLESS_NORMAL_EVENT_MID_REWARD_ITEMS, ...MAPLESS_NORMAL_EVENT_LARGE_REWARD_ITEMS]
    .map((itemId) => [itemId, Object.freeze({ valid:true, pocket:"general" })]),
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
function canonicalData(event) {
  const seeded = hydrateMaplessV108MeteorFragmentFixedData(event.normal_seed, {});
  const existing = event.normal_data ?? {};
  return {
    ...seeded,
    ...existing,
    rock_choices:Array.isArray(existing.rock_choices) ? [...existing.rock_choices] : [...(seeded.rock_choices ?? [])],
  };
}
function rockChoices(event) { return [...(canonicalData(event).rock_choices ?? [])]; }
function parsedAction(requestedAction) {
  const raw = String(requestedAction ?? "");
  if (raw.startsWith("rock:")) return { action:"rock", rockChoice:raw.slice(5) };
  return { action:raw, rockChoice:null };
}
function rewardPockets(runtime) {
  return { general:{ slots:runtime?.bag?.slots ?? [], maxSlots:SAFARI_BAG_MAX_SLOTS, maxPerSlot:SAFARI_BAG_MAX_PER_SLOT } };
}
function directReward(runtime, items) {
  if (!Array.isArray(items) || items.length === 0) return null;
  const itemMeta = Object.fromEntries(items.map((itemId) => [itemId, { valid:true, pocket:"general" }]));
  return resolveRewardTransaction({ pockets:rewardPockets(runtime), itemMeta, items });
}
function sharedLargeReward(runtime) {
  const state = stateOf(runtime);
  ensureSafariEncounterSeed(state);
  const counter = state.preview_encounter_counter;
  const reward = resolveMaplessNormalEventLargeReward({
    day:Math.max(1, Math.trunc(Number(state.day) || 1)),
    count:1,
    randomInt:(max) => borrowSafariSharedRunRandomInt(runtime, max),
    itemMeta:LARGE_ITEM_META,
    pockets:rewardPockets(runtime),
  });
  if (!reward.success) state.preview_encounter_counter = counter;
  return reward;
}
function canonicalReward(runtime, event, parsed) {
  if (parsed.action === "leave") return { canonical:{ kind:"none", items:[] }, transaction:null };
  const data = canonicalData(event);
  const canonical = resolveMaplessV108MeteorFragmentReward(event.normal_seed, parsed.action, {
    rockChoices:data.rock_choices,
    rockChoice:parsed.rockChoice,
    smashRoll:data.smash_roll,
  });
  if (canonical.kind === "invalid_rock_choice") return { canonical, transaction:null };
  if (canonical.kind === "shared_large") return { canonical, transaction:sharedLargeReward(runtime) };
  return { canonical, transaction:directReward(runtime, canonical.items) };
}
function applyPartyDamage(runtime, percent) {
  runtime.player.party = party(runtime).map((pokemon) => {
    if (!usable(pokemon)) return pokemon;
    const maxHp = Math.max(1, Math.trunc(Number(pokemon.max_hp ?? pokemon.hp ?? 1)));
    const damage = Math.max(1, Math.ceil(maxHp * Math.trunc(Number(percent)) / 100));
    return updatePokemonRuntime(pokemon, { hp:Math.max(1, Number(pokemon.hp) - damage) });
  });
}
function applyReward(runtime, reward) {
  if (!reward?.success) return [];
  runtime.bag ??= { slots:[], money:0 };
  runtime.bag.slots = reward.pockets.general.slots.filter(Boolean);
  return (reward.granted ?? []).map((entry) => ({ op:"runtime_grant_item", item:entry.item, quantity:entry.quantity }));
}

export function safariMeteorFragmentRockChoices(runtime, index) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "meteor_fragment") return [];
  return hasType(runtime, "ROCK") ? rockChoices(event) : [];
}

export function resolveSafariMeteorFragmentInteraction(runtime, index, requestedAction) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "meteor_fragment") throw new Error("meteor_fragment board event is required");
  if (state.battle && !state.battle.completed) return { runtime, result:"battle_active", operations:[] };
  if (state.shop) return { runtime, result:"shop_active", operations:[] };
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", operations:[] };

  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  const data = canonicalData(event);
  const preparedEvent = { ...event, normal_data:data };
  state.board_events[index] = preparedEvent;
  const parsed = parsedAction(requestedAction);
  const availableActions = [
    ...(hasType(runtime, "ROCK") ? data.rock_choices.map((item) => `rock:${item}`) : []),
    ...(hasType(runtime, "STEEL") ? ["steel"] : []),
    "smash", "carry", "leave",
  ];
  if (!availableActions.includes(String(requestedAction))) {
    return { runtime, result:"unsupported_action", completed:false, operations:[], availableActions };
  }

  const rewardPlan = canonicalReward(runtime, preparedEvent, parsed);
  if (rewardPlan.canonical.kind === "invalid_rock_choice") {
    return { runtime, result:"unsupported_action", completed:false, operations:[], availableActions };
  }
  const reward = rewardPlan.transaction;
  if (reward && !reward.success) {
    state.notice = "バッグに隕石の報酬をすべて入れる空きがありません。隕石にはまだ手を付けていません。";
    state.last_operations = reward.operations.map((operation) => structuredClone(operation));
    return { runtime, result:"reward_bag_full", completed:false, operations:state.last_operations, notice:state.notice, persistenceRequested:false, availableActions };
  }

  const resolvedItems = rewardPlan.canonical.kind === "items"
    ? rewardPlan.canonical.items
    : reward?.selectedItems ?? [];
  const owner = resolveMeteorFragment({
    event:preparedEvent,
    action:parsed.action,
    has_rock:hasType(runtime, "ROCK"),
    has_steel:hasType(runtime, "STEEL"),
    chosen_pokemon:parsed.action === "rock" ? firstUsableOfType(runtime, "ROCK") : parsed.action === "steel" ? firstUsableOfType(runtime, "STEEL") : null,
    rock_choice:parsed.rockChoice,
    reward_items:resolvedItems,
  });

  const applied = [];
  for (const operation of owner.operations ?? []) {
    if (operation.op === "damage_party") {
      applyPartyDamage(runtime, operation.amount);
      applied.push({ op:"runtime_damage_party", percent:Number(operation.amount) });
    }
  }
  if (reward?.success) applied.push(...applyReward(runtime, reward));

  state.board_events[index] = owner.event;
  state.board_consumed[index] = Boolean(owner.event.normal_resolved);
  state.last_operations = [
    ...(owner.operations ?? []).map((operation) => structuredClone(operation)),
    ...(reward?.operations ?? []).map((operation) => structuredClone(operation)),
    ...applied,
  ];
  state.notice = owner.outcome === "left" ? "隕石のかけらをそのままにして立ち去りました。"
    : owner.outcome === "rock_reward" ? "いわタイプが安全な欠片を見分け、選んだ道具を持ち帰りました。"
      : owner.outcome === "steel_reward" ? "はがねタイプが隕石を加工し、複数の道具を回収しました。"
        : owner.outcome === "carry_reward" ? "隕石のかけらを慎重に持ち帰り、道具を1つ回収しました。"
          : owner.outcome === "smash_blast" ? "隕石を砕いた瞬間に爆ぜ、手持ち全員が少し傷つきました。"
            : "隕石を砕き、中から道具を回収しました。";
  return {
    runtime,
    result:owner.outcome,
    completed:Boolean(owner.result),
    operations:state.last_operations,
    notice:state.notice,
    persistenceRequested:Boolean(owner.result),
    owner,
  };
}
