import { remove } from "./bag-economy-mart-flow.js";
import {
  applyBitterMedicineHappiness,
  isHpHealingItem,
  resolveHpHealingItemEffect,
} from "./item-hp-healing-effects.js";
import { updatePokemonRuntime } from "./pokemon-runtime.js";

export const isSafariHpHealingItem = isHpHealingItem;

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

function happinessPatch(pokemon, method) {
  if (!method || pokemon?.happiness == null) return null;
  const before = Number(pokemon.happiness);
  if (!Number.isInteger(before) || before < 0 || before > 255) return null;
  const after = applyBitterMedicineHappiness(before, method);
  return { before, after, method };
}

export function applySafariBagItemToPartyPokemon(runtime, { itemId, partyIndex, context = "field" } = {}) {
  const state = stateOf(runtime);
  const id = String(itemId ?? "").toUpperCase();
  if (!isHpHealingItem(id)) return { runtime, result: "unsupported_item", used: false, operations: [] };
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

  const hpBefore = Math.max(0, Math.trunc(Number(pokemon.hp ?? 0)));
  const maxHp = Math.max(1, Math.trunc(Number(pokemon.max_hp ?? hpBefore ?? 1)));
  const effect = resolveHpHealingItemEffect({ itemId: id, hp: hpBefore, maxHp });
  if (!effect.used) return { runtime, result: effect.result, used: false, operations: [] };

  const bitter = happinessPatch(pokemon, effect.happinessMethod);
  const removed = remove(runtime.bag.slots, id, 1);
  if (!removed) throw new Error(`failed to consume ${id} after successful item validation`);
  const patch = { hp: effect.hpAfter };
  if (bitter) patch.happiness = bitter.after;
  runtime.player.party[index] = updatePokemonRuntime(pokemon, patch);

  const operations = [
    { op: "use_item_on_pokemon", item: id, party_index: index, context },
    { op: "heal_hp", item: id, party_index: index, hp_before: hpBefore, hp_after: effect.hpAfter, amount: effect.hpGain },
  ];
  if (bitter) {
    operations.push({
      op: "change_happiness",
      item: id,
      party_index: index,
      reason: bitter.method,
      happiness_before: bitter.before,
      happiness_after: bitter.after,
    });
  }
  operations.push({ op: "remove_item", item: id, quantity: 1 });

  state.last_operations = operations;
  state.notice = `${pokemon.nickname ?? pokemon.species}のHPが${effect.hpGain}回復しました。`;
  return {
    runtime,
    result: "used",
    used: true,
    itemId: id,
    partyIndex: index,
    hpBefore,
    hpAfter: effect.hpAfter,
    happinessBefore: bitter?.before ?? null,
    happinessAfter: bitter?.after ?? null,
    operations,
    notice: state.notice,
    persistenceRequested: false,
  };
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
