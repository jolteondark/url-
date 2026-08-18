import { remove } from "./bag-economy-mart-flow.js";
import { updatePokemonRuntime } from "./pokemon-runtime.js";

// Canonical PBS/items.txt source-v0.9.108:
// POTION: FieldUse=OnPokemon, BattleUse=OnPokemon, restores 20 HP.
const ITEM_EFFECTS = Object.freeze({
  POTION: Object.freeze({ kind: "heal_hp", amount: 20, revive: false }),
});

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new TypeError("runtime variables.mapless state is required");
  }
  return state;
}

function itemQuantity(slots, itemId) {
  return (slots ?? []).reduce((total, slot) => {
    if (!slot || slot[0] !== itemId) return total;
    return total + Math.max(0, Math.trunc(Number(slot[1] ?? 0)));
  }, 0);
}

export function applySafariBagItemToPartyPokemon(runtime, { itemId, partyIndex, context = "field" } = {}) {
  const state = stateOf(runtime);
  const id = String(itemId ?? "").toUpperCase();
  const effect = ITEM_EFFECTS[id];
  if (!effect) return { runtime, result: "unsupported_item", used: false, operations: [] };
  if (context !== "field" && context !== "battle") {
    throw new RangeError(`unsupported bag item context: ${context}`);
  }
  if (context === "field" && state.battle && !state.battle.completed) {
    return { runtime, result: "battle_active", used: false, operations: [] };
  }
  if (context === "battle" && (!state.battle || state.battle.completed)) {
    return { runtime, result: "battle_missing", used: false, operations: [] };
  }
  if (state.shop) return { runtime, result: "shop_active", used: false, operations: [] };

  const index = Number(partyIndex);
  if (!Number.isInteger(index) || index < 0 || index >= (runtime.player?.party?.length ?? 0)) {
    return { runtime, result: "invalid_target", used: false, operations: [] };
  }
  const pokemon = runtime.player.party[index];
  if (!pokemon || Number(pokemon.steps_to_hatch ?? 0) > 0) {
    return { runtime, result: "invalid_target", used: false, operations: [] };
  }
  if (itemQuantity(runtime.bag?.slots, id) <= 0) {
    return { runtime, result: "item_missing", used: false, operations: [] };
  }

  if (effect.kind === "heal_hp") {
    const hpBefore = Math.max(0, Math.trunc(Number(pokemon.hp ?? 0)));
    const maxHp = Math.max(1, Math.trunc(Number(pokemon.max_hp ?? hpBefore ?? 1)));
    if (hpBefore <= 0 && !effect.revive) {
      return { runtime, result: "fainted_target", used: false, operations: [] };
    }
    if (hpBefore >= maxHp) {
      return { runtime, result: "no_effect", used: false, operations: [] };
    }
    const hpAfter = Math.min(maxHp, hpBefore + effect.amount);
    const removed = remove(runtime.bag.slots, id, 1);
    if (!removed) throw new Error(`failed to consume ${id} after successful item validation`);
    runtime.player.party[index] = updatePokemonRuntime(pokemon, { hp: hpAfter });
    const operations = [
      { op: "use_item_on_pokemon", item: id, party_index: index, context },
      { op: "heal_hp", item: id, party_index: index, hp_before: hpBefore, hp_after: hpAfter, amount: hpAfter - hpBefore },
      { op: "remove_item", item: id, quantity: 1 },
    ];
    state.last_operations = operations;
    state.notice = `${pokemon.nickname ?? pokemon.species}のHPが${hpAfter - hpBefore}回復しました。`;
    return {
      runtime,
      result: "used",
      used: true,
      itemId: id,
      partyIndex: index,
      hpBefore,
      hpAfter,
      operations,
      notice: state.notice,
      persistenceRequested: false,
    };
  }

  return { runtime, result: "unsupported_item", used: false, operations: [] };
}

export function useSafariBagItemOnPartyPokemon(runtime, options = {}) {
  const state = stateOf(runtime);
  const result = applySafariBagItemToPartyPokemon(runtime, { ...options, context: "field" });
  if (!result.used) return result;
  const operations = [...result.operations, { op: "request_save" }];
  state.last_operations = operations;
  return {
    ...result,
    operations,
    persistenceRequested: true,
  };
}
