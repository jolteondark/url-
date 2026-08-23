import { resolveRewardTransaction } from "./bag-economy-reward-transaction.js";
import { resolveHotSpring } from "./mapless-normal-events-a1-flow.js";
import { RubyMT19937Random } from "./ruby-mt19937-random.js";
import {
  damageSafariPokemonPercent,
  healSafariPartyFull,
  healSafariPartyPercent,
  inflictSafariOverworldStatus,
} from "./safari-pokemon-healing.js";
import { hasSafariUsablePartyType } from "./safari-pokemon-type-membership.js";

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
function firstUsableIndex(runtime) { return (runtime.player?.party ?? []).findIndex((pokemon) => Number(pokemon?.hp ?? 0) > 0); }
function bottleRewardItems(event) {
  const prepared = event.normal_data?.bottle_reward_items;
  if (Array.isArray(prepared) && prepared.length >= 1 && prepared.length <= 2) return [...prepared];
  const rng = new RubyMT19937Random((Number(event.normal_seed) ^ 0xb0771e) & 0x7fffffff);
  const count = 1 + rng.randInt(2);
  return Array.from({ length:count }, () => LOW_ITEMS[rng.randInt(LOW_ITEMS.length)]);
}
function preflightBottleReward(runtime, items) {
  return resolveRewardTransaction({
    pockets:{ general:{ slots:runtime.bag?.slots ?? [], maxSlots:SAFARI_BAG_MAX_SLOTS, maxPerSlot:SAFARI_BAG_MAX_PER_SLOT } },
    itemMeta:SAFARI_REWARD_ITEM_META,
    items,
  });
}

export function resolveSafariHotSpringInteraction(runtime, index, action) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "hot_spring") throw new Error("hot_spring board event is required");
  if (state.battle && !state.battle.completed) return { runtime, result: "battle_active", operations: [] };
  if (state.shop) return { runtime, result: "shop_active", operations: [] };
  if (state.board_consumed?.[index]) return { runtime, result: "already_consumed", operations: [] };

  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  const preparedEvent = { ...event, normal_data: { ...(event.normal_data ?? {}) } };
  if (action === "enter" && !Number.isInteger(preparedEvent.normal_data.enter_roll)) {
    preparedEvent.normal_data.enter_roll = new RubyMT19937Random(Number(preparedEvent.normal_seed ?? 0) & 0x7fffffff).randInt(100);
  }

  let bottleReward = null;
  if (action === "bottle") {
    const rewardItems = bottleRewardItems(preparedEvent);
    bottleReward = preflightBottleReward(runtime, rewardItems);
    if (!bottleReward.success) {
      state.notice = "バッグに温泉水の報酬をすべて入れる空きがありません。温泉はまだ利用していません。";
      state.last_operations = bottleReward.operations.map((operation) => structuredClone(operation));
      return {
        runtime,
        result:"reward_bag_full",
        completed:false,
        operations:state.last_operations,
        notice:state.notice,
        persistenceRequested:false,
        availableActions:["safe", "enter", "bottle", "leave"],
      };
    }
    preparedEvent.normal_data.bottle_reward_items = rewardItems;
  }

  const owner = resolveHotSpring({
    event: preparedEvent,
    action,
    enter_roll: preparedEvent.normal_data.enter_roll,
    has_water: hasSafariUsablePartyType(runtime, "WATER"),
    has_ice: hasSafariUsablePartyType(runtime, "ICE"),
    reward_items: action === "bottle" ? preparedEvent.normal_data.bottle_reward_items : undefined,
  });
  const applied = [];
  if (owner.result && action === "safe") {
    healSafariPartyFull(runtime);
    applied.push({ op: "runtime_full_heal_party" });
  } else if (owner.result && action === "enter") {
    if (owner.outcome === "enter_half_heal") {
      healSafariPartyPercent(runtime, 50);
      applied.push({ op: "runtime_heal_party_percent", amount: 50, revive: false });
    } else if (owner.outcome === "enter_full_heal") {
      healSafariPartyFull(runtime);
      applied.push({ op: "runtime_full_heal_party" });
    } else if (owner.outcome === "enter_burn") {
      const activeIndex = firstUsableIndex(runtime);
      if (activeIndex >= 0) {
        let pokemon = damageSafariPokemonPercent(runtime.player.party[activeIndex], 15);
        pokemon = inflictSafariOverworldStatus(pokemon, "BURN");
        runtime.player.party[activeIndex] = pokemon;
        applied.push({ op: "runtime_damage_pokemon", party_index: activeIndex, amount: 15 }, { op: "runtime_inflict_status", party_index: activeIndex, status: "BURN" });
      }
    }
  }
  if (bottleReward?.success) {
    runtime.bag.slots = bottleReward.pockets.general.slots.filter(Boolean);
    applied.push(...bottleReward.granted.map((entry) => ({ op:"runtime_grant_item", item:entry.item, quantity:entry.quantity })));
  }

  state.board_events[index] = owner.event;
  state.board_consumed[index] = Boolean(owner.event.normal_resolved);
  state.last_operations = [
    ...(owner.operations ?? []).map((operation) => structuredClone(operation)),
    ...(bottleReward?.operations ?? []).map((operation) => structuredClone(operation)),
    ...applied,
  ];
  state.notice = owner.outcome === "safe_full_heal" ? "みず・こおりタイプの力で安全に温泉を整え、手持ちが完全回復しました。"
    : owner.outcome === "enter_half_heal" ? "温泉で休み、手持ちのHPが回復しました。"
      : owner.outcome === "enter_full_heal" ? "温泉で十分に休み、手持ちが完全回復しました。"
        : owner.outcome === "enter_burn" ? "熱湯が噴き出し、先頭のポケモンが傷とやけどを負いました。"
          : owner.outcome === "bottled_water" ? "温泉水を汲み、道具として持ち帰りました。"
            : "温泉を使わず立ち去りました。";
  return { runtime, result: owner.outcome, completed: Boolean(owner.result), roll: preparedEvent.normal_data.enter_roll ?? null, operations: state.last_operations, notice: state.notice, persistenceRequested: Boolean(owner.result), owner };
}

export function interactiveSafariHotSpring(runtime, index) {
  const state = stateOf(runtime);
  const confirmFn = typeof globalThis.confirm === "function" ? globalThis.confirm.bind(globalThis) : null;
  if (!confirmFn) {
    state.board_revealed[index] = true;
    state.board_visited[index] = true;
    state.notice = "岩の割れ目から温泉が湧いています。";
    return { runtime, result: "hot_spring_ready", boundary: "normal_event", notice: state.notice, operations: [] };
  }
  const enter = confirmFn("岩の割れ目から温泉が湧いています。\nそのまま入って休みますか？\n（キャンセルで立ち去る）");
  return { ...resolveSafariHotSpringInteraction(runtime, index, enter ? "enter" : "leave"), boundary: "normal_event" };
}
