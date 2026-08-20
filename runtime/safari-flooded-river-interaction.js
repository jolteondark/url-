import { quantity, remove } from "./bag-economy-mart-flow.js";
import { resolveFloodedRiver } from "./mapless-normal-events-a1-flow.js";
import { updatePokemonRuntime } from "./pokemon-runtime.js";
import { RubyMT19937Random } from "./ruby-mt19937-random.js";

const LOW_ITEMS = Object.freeze([
  "POTION", "ANTIDOTE", "PARALYZEHEAL", "AWAKENING", "BURNHEAL", "ICEHEAL",
  "POKEBALL", "ORANBERRY", "PECHABERRY", "CHERIBERRY", "FRESHWATER", "SODAPOP",
]);

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}

function hasType(runtime, typeId) {
  const wanted = String(typeId).toUpperCase();
  return (runtime.player?.party ?? []).some((pokemon) => {
    if (!pokemon || Number(pokemon.hp ?? 0) <= 0 || pokemon.egg === true) return false;
    const types = Array.isArray(pokemon.types) ? pokemon.types : Array.isArray(pokemon.type_ids) ? pokemon.type_ids : [];
    return types.some((type) => String(type).toUpperCase() === wanted);
  });
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

function applyPartyDamage(runtime, percent) {
  runtime.player.party = (runtime.player?.party ?? []).map((pokemon) => {
    if (!pokemon || Number(pokemon.hp ?? 0) <= 0 || pokemon.egg === true) return pokemon;
    const maxHp = Math.max(1, Math.trunc(Number(pokemon.max_hp ?? pokemon.hp ?? 1)));
    const damage = Math.max(1, Math.ceil(maxHp * Math.trunc(Number(percent)) / 100));
    return updatePokemonRuntime(pokemon, { hp: Math.max(1, Number(pokemon.hp) - damage) });
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
  if (!["force", "leave"].includes(action)) {
    return { runtime, result: "unsupported_action", completed: false, operations: [], availableActions: ["force", "leave"] };
  }

  let preparedEvent = event;
  let lostItem = null;
  if (action === "force") {
    const force = canonicalForceInput(runtime, event);
    lostItem = force.lostItem;
    preparedEvent = {
      ...event,
      normal_data: { ...(event.normal_data ?? {}), force_roll: force.forceRoll },
    };
  }
  const owner = resolveFloodedRiver({
    event: preparedEvent,
    action,
    force_roll: preparedEvent.normal_data?.force_roll,
    lost_item: lostItem,
    has_water: hasType(runtime, "WATER"),
    has_ice: hasType(runtime, "ICE"),
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

  state.board_events[index] = owner.event;
  state.board_consumed[index] = Boolean(owner.event.normal_resolved);
  state.last_operations = [...(owner.operations ?? []).map((operation) => structuredClone(operation)), ...applied];
  state.notice = owner.outcome === "left"
    ? "川を渡らず引き返しました。"
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

  if (!promptFn && !confirmFn) {
    state.board_revealed[index] = true;
    state.board_visited[index] = true;
    state.notice = "増水した川が進路を遮っています。強引に渡るか、引き返せます。";
    return {
      runtime,
      result: "flooded_river_ready",
      boundary: "normal_event",
      availableActions: ["force", "leave"],
      specialRoutes: { water, ice },
      notice: state.notice,
      operations: [],
    };
  }

  if (promptFn && (water || ice)) {
    const choices = [
      ...(water ? ["みずタイプに鎮めさせる（接続待ち）"] : []),
      ...(ice ? ["こおりタイプに凍らせる（接続待ち）"] : []),
      "強引に渡る",
      "引き返す",
    ];
    const selected = Number.parseInt(promptFn(`増水した川が進路を遮っている。\n${choices.map((choice, i) => `${i + 1}. ${choice}`).join("\n")}`, String(choices.length)), 10) - 1;
    if (!Number.isInteger(selected) || selected < 0 || selected >= choices.length) {
      return { runtime, result: "cancelled", boundary: "normal_event", operations: [] };
    }
    const specialCount = Number(water) + Number(ice);
    if (selected < specialCount) {
      state.notice = "このタイプ専用ルートのcanonical報酬接続はまだ未完了です。";
      return { runtime, result: "special_route_pending", boundary: "normal_event", notice: state.notice, operations: [] };
    }
    return { ...resolveSafariFloodedRiverInteraction(runtime, index, selected === specialCount ? "force" : "leave"), boundary: "normal_event" };
  }

  const force = confirmFn("増水した川が進路を遮っています。\n強引に渡りますか？\n（キャンセルで引き返す）");
  return { ...resolveSafariFloodedRiverInteraction(runtime, index, force ? "force" : "leave"), boundary: "normal_event" };
}
