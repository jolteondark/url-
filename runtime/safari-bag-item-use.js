import { remove } from "./bag-economy-mart-flow.js";
import { updatePokemonRuntime } from "./pokemon-runtime.js";
import {
  getSafariItemDisplayName,
  normalizeSafariItemId,
  resolveSafariPartyItemEffect,
} from "./safari-item-effects.js";

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

function effectOperations(resolved, id, index) {
  const operations = [];
  if (resolved.effect.kind === "revive") {
    operations.push({
      op: "revive",
      item: id,
      party_index: index,
      hp_before: resolved.hpBefore,
      hp_after: resolved.hpAfter,
      amount: resolved.healedAmount,
    });
  } else if (resolved.healedAmount > 0) {
    operations.push({
      op: "heal_hp",
      item: id,
      party_index: index,
      hp_before: resolved.hpBefore,
      hp_after: resolved.hpAfter,
      amount: resolved.healedAmount,
    });
  }
  if (resolved.statusCured) {
    operations.push({
      op: "cure_status",
      item: id,
      party_index: index,
      status_before: resolved.statusBefore,
    });
  }
  if (resolved.confusionCured) {
    operations.push({
      op: "cure_confusion",
      item: id,
      party_index: index,
    });
  }
  return operations;
}

function effectNotice(pokemon, id, resolved) {
  const name = pokemon.nickname ?? pokemon.species;
  const itemName = getSafariItemDisplayName(id);
  if (resolved.effect.kind === "revive") return `${name}は${itemName}で元気を取り戻しました。`;
  const parts = [];
  if (resolved.healedAmount > 0) parts.push(`HPが${resolved.healedAmount}回復`);
  if (resolved.statusCured) parts.push("状態異常が回復");
  if (resolved.confusionCured) parts.push("こんらんが回復");
  return parts.length > 0
    ? `${name}は${itemName}で${parts.join("し、")}しました。`
    : `${name}に${itemName}を使いました。`;
}

export function applySafariBagItemToPartyPokemon(runtime, { itemId, partyIndex, context = "field" } = {}) {
  const state = stateOf(runtime);
  const id = normalizeSafariItemId(itemId);
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

  const resolved = resolveSafariPartyItemEffect(pokemon, id);
  if (!resolved.supported) {
    return { runtime, result: "unsupported_item", used: false, operations: [] };
  }
  if (!resolved.usable) {
    return { runtime, result: resolved.reason, used: false, operations: [] };
  }

  const removed = remove(runtime.bag.slots, id, 1);
  if (!removed) throw new Error(`failed to consume ${id} after successful item validation`);
  runtime.player.party[index] = updatePokemonRuntime(pokemon, resolved.pokemonPatch);
  const operations = [
    { op: "use_item_on_pokemon", item: id, party_index: index, context },
    ...effectOperations(resolved, id, index),
    { op: "remove_item", item: id, quantity: 1 },
  ];
  state.last_operations = operations;
  state.notice = effectNotice(pokemon, id, resolved);
  return {
    runtime,
    result: "used",
    used: true,
    itemId: id,
    partyIndex: index,
    hpBefore: resolved.hpBefore,
    hpAfter: resolved.hpAfter,
    healedAmount: resolved.healedAmount,
    statusBefore: resolved.statusBefore,
    statusAfter: resolved.statusAfter,
    statusCured: resolved.statusCured,
    confusionCured: resolved.confusionCured,
    effectKind: resolved.effect.kind,
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
