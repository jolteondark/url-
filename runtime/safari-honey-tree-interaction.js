import { resolveRewardTransaction } from "./bag-economy-reward-transaction.js";
import { resolveHoneyTree } from "./mapless-normal-events-a2-flow.js";
import { RubyMT19937Random } from "./ruby-mt19937-random.js";
import { hasSafariUsablePartyType, safariPokemonTypes } from "./safari-pokemon-type-membership.js";

const LOW_ITEMS = Object.freeze([
  "POTION", "ANTIDOTE", "PARALYZEHEAL", "AWAKENING", "BURNHEAL", "ICEHEAL",
  "POKEBALL", "ORANBERRY", "PECHABERRY", "CHERIBERRY", "FRESHWATER", "SODAPOP",
]);
const BERRIES = Object.freeze(["ORANBERRY", "PECHABERRY", "CHERIBERRY"]);
const SAFARI_BAG_MAX_SLOTS = 20;
const SAFARI_BAG_MAX_PER_SLOT = 99;
const ITEM_META = Object.freeze(Object.fromEntries(
  ["HONEY", ...LOW_ITEMS].map((itemId) => [itemId, Object.freeze({ valid:true, pocket:"general" })]),
));

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}
function usable(pokemon) { return Boolean(pokemon) && Number(pokemon.hp ?? 0) > 0 && pokemon.egg !== true; }
function firstUsableBug(runtime) {
  return (runtime.player?.party ?? []).find((pokemon) => usable(pokemon) && safariPokemonTypes(pokemon).includes("BUG")) ?? null;
}
function deterministicItem(event, salt, pool = LOW_ITEMS) {
  const rng = new RubyMT19937Random((Number(event.normal_seed) ^ salt) & 0x7fffffff);
  return pool[rng.randInt(pool.length)];
}
function rewardItemsFor(event, action) {
  if (action === "bug") return ["HONEY", "HONEY"];
  if (action !== "bark") return [];
  const roll = Number(event.normal_data?.bark_roll);
  if (!Number.isFinite(roll)) throw new Error("honey_tree bark_roll unresolved");
  if (roll < 50) return [deterministicItem(event, 0xb33, BERRIES)];
  if (roll < 75) return [deterministicItem(event, 0x5a11)];
  return [];
}
function preflightReward(runtime, items) {
  if (items.length === 0) return null;
  return resolveRewardTransaction({
    pockets:{ general:{ slots:runtime.bag?.slots ?? [], maxSlots:SAFARI_BAG_MAX_SLOTS, maxPerSlot:SAFARI_BAG_MAX_PER_SLOT } },
    itemMeta:ITEM_META,
    items,
  });
}

export function resolveSafariHoneyTreeInteraction(runtime, index, requestedAction) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "honey_tree") throw new Error("honey_tree board event is required");
  if (state.battle && !state.battle.completed) return { runtime, result:"battle_active", operations:[] };
  if (state.shop) return { runtime, result:"shop_active", operations:[] };
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", operations:[] };

  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  const hasBug = hasSafariUsablePartyType(runtime, "BUG");
  const availableActions = [...(hasBug ? ["bug"] : []), "bark", "leave"];
  const action = String(requestedAction ?? "");
  if (action === "shake") {
    state.notice = "木を揺らすルートはcanonicalの野生戦補正をBattle ownerへ渡す接続待ちです。";
    return { runtime, result:"battle_modifier_handoff_required", completed:false, operations:[], notice:state.notice, persistenceRequested:false, availableActions };
  }
  if (!availableActions.includes(action)) return { runtime, result:"unsupported_action", completed:false, operations:[], availableActions };

  const rewards = rewardItemsFor(event, action);
  const reward = preflightReward(runtime, rewards);
  if (reward && !reward.success) {
    state.notice = "バッグにハチミツの木の報酬をすべて入れる空きがありません。木にはまだ手を付けていません。";
    state.last_operations = reward.operations.map((operation) => structuredClone(operation));
    return { runtime, result:"reward_bag_full", completed:false, operations:state.last_operations, notice:state.notice, persistenceRequested:false, availableActions };
  }

  const owner = resolveHoneyTree({
    event,
    action,
    has_bug:hasBug,
    chosen_pokemon:action === "bug" ? firstUsableBug(runtime) : null,
    honey_exists:true,
    honey_count:2,
    reward_items:action === "bark" && Number(event.normal_data?.bark_roll) < 50 ? rewards : undefined,
  });

  const applied = [];
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
  state.notice = owner.outcome === "left" ? "ハチミツの木をそのままにして立ち去りました。"
    : owner.outcome === "bug_safe_reward" ? "むしタイプが安全に木を調べ、ハチミツを回収しました。"
      : owner.outcome === "bark_berry" ? "樹皮の陰からきのみを見つけました。"
        : owner.outcome === "bark_small" ? "樹皮の陰から小さな道具を見つけました。"
          : "樹皮を調べましたが、何も見つかりませんでした。";
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
