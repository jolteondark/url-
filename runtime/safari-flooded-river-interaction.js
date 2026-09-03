import { quantity, remove } from "./bag-economy-mart-flow.js";
import { resolveRewardTransaction } from "./bag-economy-reward-transaction.js";
import { resolveFloodedRiver } from "./mapless-normal-events-a1-flow.js";
import { resolveMaplessV108FloodedRiverReward } from "./mapless-v108-event-local-item-reward.js";
import { RubyMT19937Random } from "./ruby-mt19937-random.js";
import { commitSafariBagEconomyReceipt } from "./safari-bag-economy-receipt.js";
import { damageSafariPokemonPercent } from "./safari-pokemon-healing.js";
import { hasSafariUsablePartyType, safariPokemonTypes } from "./safari-pokemon-type-membership.js";

const LOW_ITEMS = Object.freeze([
  "POTION", "ANTIDOTE", "PARALYZEHEAL", "AWAKENING", "BURNHEAL", "ICEHEAL",
  "POKEBALL", "ORANBERRY", "PECHABERRY", "CHERIBERRY", "FRESHWATER", "SODAPOP",
]);
const SAFARI_BAG_MAX_SLOTS = 20;
const SAFARI_BAG_MAX_PER_SLOT = 99;

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}

function hasType(runtime, typeId) {
  return hasSafariUsablePartyType(runtime, typeId);
}

function firstUsablePokemonOfType(runtime, typeId) {
  const wanted = String(typeId).toUpperCase();
  return (runtime.player?.party ?? []).find((pokemon) => (
    pokemon
    && Number(pokemon.hp ?? 0) > 0
    && pokemon.egg !== true
    && safariPokemonTypes(pokemon).includes(wanted)
  )) ?? null;
}

function canonicalForceInput(runtime, event) {
  const normalSeed = Number(event.normal_seed) & 0x7fffffff;
  const rng = new RubyMT19937Random(normalSeed);
  const storedRoll = Number(event.normal_data?.force_roll);
  const hasStoredRoll = Number.isInteger(storedRoll) && storedRoll >= 0 && storedRoll < 100;
  const forceRoll = hasStoredRoll ? storedRoll : rng.randInt(100);
  const candidates = LOW_ITEMS.filter((itemId) => quantity(runtime.bag?.slots ?? [], itemId) > 0);
  const lostItem = forceRoll >= 90 && candidates.length > 0
    ? candidates[rng.randInt(candidates.length)]
    : null;
  return { forceRoll, lostItem };
}

function canonicalSpecialRewardItems(event, action) {
  const key = action === "water" ? "water_reward_items" : "ice_reward_items";
  const prepared = event.normal_data?.[key];
  if (Array.isArray(prepared) && prepared.length > 0) return [...prepared];
  return resolveMaplessV108FloodedRiverReward(event.normal_seed, action);
}

function preflightSpecialReward(runtime, items) {
  const itemMeta = Object.fromEntries(items.map((itemId) => [itemId, { valid: true, pocket: "general" }]));
  return resolveRewardTransaction({
    pockets: {
      general: {
        slots: runtime.bag?.slots ?? [],
        maxSlots: SAFARI_BAG_MAX_SLOTS,
        maxPerSlot: SAFARI_BAG_MAX_PER_SLOT,
      },
    },
    itemMeta,
    items,
  });
}

function applyPartyDamage(runtime, percent) {
  runtime.player.party = (runtime.player?.party ?? []).map((pokemon) => {
    if (!pokemon || Number(pokemon.hp ?? 0) <= 0 || pokemon.egg === true) return pokemon;
    return damageSafariPokemonPercent(pokemon, percent);
  });
}

export function resolveSafariFloodedRiverInteraction(runtime, index, action) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "flooded_river") {
    throw new Error("flooded_river board event is required");
  }
  if (state.battle && !state.battle.completed) return { runtime, result: "battle_active", operations: [] };
  if (state.shop) return { runtime, result: "shop_active", operations: [] };
  if (state.board_consumed?.[index]) return { runtime, result: "already_consumed", operations: [] };

  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  const availableActions = [
    ...(hasType(runtime, "WATER") ? ["water"] : []),
    ...(hasType(runtime, "ICE") ? ["ice"] : []),
    "force",
    "leave",
  ];
  if (!availableActions.includes(action)) {
    return { runtime, result: "unsupported_action", completed: false, operations: [], availableActions };
  }

  let preparedEvent = event;
  let lostItem = null;
  let specialReward = null;
  let chosenPokemon = null;
  if (action === "force") {
    const force = canonicalForceInput(runtime, event);
    lostItem = force.lostItem;
    preparedEvent = {
      ...event,
      normal_data: { ...(event.normal_data ?? {}), force_roll: force.forceRoll },
    };
  } else if (action === "water" || action === "ice") {
    chosenPokemon = firstUsablePokemonOfType(runtime, action === "water" ? "WATER" : "ICE");
    const rewardItems = canonicalSpecialRewardItems(event, action);
    specialReward = preflightSpecialReward(runtime, rewardItems);
    if (!specialReward.success) {
      state.notice = "バッグに報酬をすべて入れる空きがありません。川はまだ渡っていません。";
      state.last_operations = specialReward.operations.map((operation) => structuredClone(operation));
      return {
        runtime,
        result: "reward_bag_full",
        completed: false,
        operations: state.last_operations,
        notice: state.notice,
        persistenceRequested: false,
        availableActions,
      };
    }
    preparedEvent = {
      ...event,
      normal_data: { ...(event.normal_data ?? {}), [`${action}_reward_items`]: rewardItems },
    };
  }

  const owner = resolveFloodedRiver({
    event: preparedEvent,
    action,
    force_roll: preparedEvent.normal_data?.force_roll,
    lost_item: lostItem,
    has_water: hasType(runtime, "WATER"),
    has_ice: hasType(runtime, "ICE"),
    chosen_pokemon: chosenPokemon,
    reward_items: action === "water" || action === "ice"
      ? preparedEvent.normal_data?.[`${action}_reward_items`]
      : undefined,
  });

  const applied = [];
  for (const operation of owner.operations ?? []) {
    if (operation.op === "damage_party") {
      applyPartyDamage(runtime, operation.amount);
      applied.push({ op: "runtime_damage_party", percent: Number(operation.amount) });
    } else if (operation.op === "remove_item") {
      const removed = remove(runtime.bag.slots, operation.item, Number(operation.quantity ?? 1));
      if (!removed) throw new Error(`canonical flooded river item loss could not remove ${operation.item}`);
      applied.push({ op: "runtime_remove_item", item: operation.item, quantity: Number(operation.quantity ?? 1) });
    }
  }
  if (specialReward?.success) {
    const receipt = commitSafariBagEconomyReceipt(runtime, { reward: specialReward });
    if (!receipt.success) throw new Error(`canonical flooded river reward commit failed: ${receipt.result}`);
    applied.push(...receipt.operations);
  }

  state.board_events[index] = owner.event;
  state.board_consumed[index] = Boolean(owner.event.normal_resolved);
  state.last_operations = [
    ...(owner.operations ?? []).map((operation) => structuredClone(operation)),
    ...applied,
  ];
  state.notice = owner.outcome === "left"
    ? "川を渡らず引き返しました。"
    : owner.outcome === "water_crossing"
      ? "みずタイプの力で安全に川を渡り、流れ着いた道具を拾いました。"
      : owner.outcome === "ice_crossing"
        ? "こおりタイプの力で川面を凍らせて渡り、道具を拾いました。"
        : owner.outcome === "force_minor_damage"
          ? "濁流から戻り、手持ち全員が少し傷つきました。"
          : owner.outcome === "force_major_damage"
            ? "濁流から戻り、手持ち全員が大きく傷つきました。"
            : "濁流から戻りましたが、荷物を1つ流されました。";
  return {
    runtime,
    result: owner.outcome,
    completed: Boolean(owner.result),
    operations: state.last_operations,
    notice: state.notice,
    persistenceRequested: Boolean(owner.result),
    owner,
  };
}

export function interactiveSafariFloodedRiver(runtime, index) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (!event || event.normal_event_id !== "flooded_river") throw new Error("flooded_river board event is required");
  const water = hasType(runtime, "WATER");
  const ice = hasType(runtime, "ICE");
  const promptFn = typeof globalThis.prompt === "function" ? globalThis.prompt.bind(globalThis) : null;
  const confirmFn = typeof globalThis.confirm === "function" ? globalThis.confirm.bind(globalThis) : null;
  const availableActions = [...(water ? ["water"] : []), ...(ice ? ["ice"] : []), "force", "leave"];

  if (!promptFn && !confirmFn) {
    state.board_revealed[index] = true;
    state.board_visited[index] = true;
    state.notice = water || ice
      ? "増水した川が進路を遮っています。手持ちのタイプを活かして安全に渡れそうです。"
      : "増水した川が進路を遮っています。強引に渡るか、引き返せます。";
    return {
      runtime,
      result: "flooded_river_ready",
      boundary: "normal_event",
      availableActions,
      specialRoutes: { water, ice },
      notice: state.notice,
      operations: [],
    };
  }

  if (promptFn && (water || ice)) {
    const actions = [
      ...(water ? [{ id: "water", label: "みずタイプに流れを鎮めさせる" }] : []),
      ...(ice ? [{ id: "ice", label: "こおりタイプに川面を凍らせる" }] : []),
      { id: "force", label: "強引に渡る" },
      { id: "leave", label: "引き返す" },
    ];
    const selected = Number.parseInt(promptFn(`増水した川が進路を遮っている。\n${actions.map((choice, i) => `${i + 1}. ${choice.label}`).join("\n")}`, String(actions.length)), 10) - 1;
    if (!Number.isInteger(selected) || selected < 0 || selected >= actions.length) {
      return { runtime, result: "cancelled", boundary: "normal_event", operations: [] };
    }
    return { ...resolveSafariFloodedRiverInteraction(runtime, index, actions[selected].id), boundary: "normal_event" };
  }

  const force = confirmFn("増水した川が進路を遮っています。\n強引に渡りますか？\n（キャンセルで引き返す）");
  return { ...resolveSafariFloodedRiverInteraction(runtime, index, force ? "force" : "leave"), boundary: "normal_event" };
}
