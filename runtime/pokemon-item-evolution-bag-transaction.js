import { quantity, remove } from "./bag-economy-mart-flow.js";
import { resolvePokemonItemEvolution } from "./pokemon-item-evolution-runtime.js";

function normalizedDataId(value) {
  return String(value ?? "").replace(/^:/, "");
}

function cloneBagSlots(slots) {
  if (!Array.isArray(slots)) throw new TypeError("bagSlots must be an array");
  return slots.map((slot) => slot == null ? null : [slot[0], Number(slot[1])]);
}

/**
 * Resolve a Bag-used Item/Stone evolution as one atomic transaction.
 *
 * The evolution owner remains authoritative for eligibility and Pokemon
 * continuity. The bag owner is mutated only after a successful evolution has
 * explicitly requested consumption, preventing failed uses from spending an
 * item and preventing successful uses from consuming more than one item.
 */
export function resolvePokemonItemEvolutionBagTransaction(runtime, item, {
  bagSlots,
  ...evolutionOptions
} = {}) {
  const itemId = normalizedDataId(item);
  const nextBagSlots = cloneBagSlots(bagSlots);
  const ownedBefore = itemId ? quantity(nextBagSlots, itemId) : 0;

  if (!itemId || ownedBefore < 1) {
    return {
      pokemon: runtime,
      evolved: false,
      evolution: null,
      consumeRequested: false,
      consumedItem: null,
      consumedCount: 0,
      bagSlots: nextBagSlots,
      reason: "item_not_owned",
      operations: [],
    };
  }

  const resolved = resolvePokemonItemEvolution(runtime, itemId, evolutionOptions);
  if (!resolved.evolved || resolved.consumeRequested !== true) {
    return {
      ...resolved,
      consumedCount: 0,
      bagSlots: nextBagSlots,
      reason: resolved.evolved ? "consumption_not_requested" : "evolution_failed",
    };
  }

  if (normalizedDataId(resolved.consumedItem) !== itemId) {
    throw new Error("item evolution requested consumption of a different item");
  }
  if (!remove(nextBagSlots, itemId, 1)) {
    throw new Error("item evolution succeeded but the consumed item could not be removed");
  }

  return {
    ...resolved,
    consumedCount: 1,
    bagSlots: nextBagSlots,
    reason: "evolved",
  };
}
