import { resolveRewardTransaction } from "./bag-economy-reward-transaction.js";
import { resolveMeteorFragment } from "./mapless-normal-events-a2-flow.js";
import { updatePokemonRuntime } from "./pokemon-runtime.js";
import { RubyMT19937Random } from "./ruby-mt19937-random.js";
import { hasSafariUsablePartyType, safariPokemonTypes } from "./safari-pokemon-type-membership.js";

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
function deterministicItems(event, salt, count) {
  const rng = new RubyMT19937Random((Number(event.normal_seed) ^ salt) & 0x7fffffff);
  return Array.from({ length:count }, () => LOW_ITEMS[rng.randInt(LOW_ITEMS.length)]);
}
function rockChoices(event) {
  const stored = event.normal_data?.rock_choices;
  if (Array.isArray(stored) && stored.length > 0) return [...stored];
  return [...new Set(deterministicItems(event, 0x70c4, 3))];
}
function parsedAction(requestedAction) {
  const raw = String(requestedAction ?? "");
  if (raw.startsWith("rock:")) return { action:"rock", rockChoice:raw.slice(5) };
  return { action:raw, rockChoice:null };
}
function rewardItemsFor(event, parsed) {
  if (parsed.action === "rock") return parsed.rockChoice ? [parsed.rockChoice] : [];
  if (parsed.action === "steel") {
    const rng = new RubyMT19937Random((Number(event.normal_seed) ^ 0x57ee1) & 0x7fffffff);
    return deterministicItems(event, 0x57ee1, 2 + rng.randInt(2));
  }
  if (parsed.action === "carry") return deterministicItems(event, 0xca771, 1);
  if (parsed.action === "smash") {
    const roll = Number(event.normal_data?.smash_roll);
    return roll < 90 ? deterministicItems(event, roll < 55 ? 0x570ae : roll < 80 ? 0x57a2 : 0x1a29e, 1) : [];
  }
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
function applyPartyDamage(runtime, percent) {
  runtime.player.party = party(runtime).map((pokemon) => {
    if (!usable(pokemon)) return pokemon;
    const maxHp = Math.max(1, Math.trunc(Number(pokemon.max_hp ?? pokemon.hp ?? 1)));
    const damage = Math.max(1, Math.ceil(maxHp * Math.trunc(Number(percent)) / 100));
    return updatePokemonRuntime(pokemon, { hp:Math.max(1, Number(pokemon.hp) - damage) });
  });
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
  const parsed = parsedAction(requestedAction);
  const availableActions = [
    ...(hasType(runtime, "ROCK") ? rockChoices(event).map((item) => `rock:${item}`) : []),
    ...(hasType(runtime, "STEEL") ? ["steel"] : []),
    "smash", "carry", "leave",
  ];
  if (!availableActions.includes(String(requestedAction))) {
    return { runtime, result:"unsupported_action", completed:false, operations:[], availableActions };
  }

  const rewards = rewardItemsFor(event, parsed);
  const reward = preflightReward(runtime, rewards);
  if (reward && !reward.success) {
    state.notice = "バッグに隕石の報酬をすべて入れる空きがありません。隕石にはまだ手を付けていません。";
    state.last_operations = reward.operations.map((operation) => structuredClone(operation));
    return { runtime, result:"reward_bag_full", completed:false, operations:state.last_operations, notice:state.notice, persistenceRequested:false, availableActions };
  }

  const preparedEvent = parsed.action === "rock"
    ? { ...event, normal_data:{ ...(event.normal_data ?? {}), rock_choices:rockChoices(event) } }
    : event;
  const owner = resolveMeteorFragment({
    event:preparedEvent,
    action:parsed.action,
    has_rock:hasType(runtime, "ROCK"),
    has_steel:hasType(runtime, "STEEL"),
    chosen_pokemon:parsed.action === "rock" ? firstUsableOfType(runtime, "ROCK") : parsed.action === "steel" ? firstUsableOfType(runtime, "STEEL") : null,
    rock_choice:parsed.rockChoice,
    reward_items:rewards,
  });

  const applied = [];
  for (const operation of owner.operations ?? []) {
    if (operation.op === "damage_party") {
      applyPartyDamage(runtime, operation.amount);
      applied.push({ op:"runtime_damage_party", percent:Number(operation.amount) });
    }
  }
  if (reward?.success) {
    runtime.bag.slots = reward.pockets.general.slots.filter(Boolean);
    applied.push(...reward.granted.map((entry) => ({ op:"runtime_grant_item", item:entry.item, quantity:entry.quantity })));
  }

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
