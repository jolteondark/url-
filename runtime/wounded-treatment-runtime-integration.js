import { quantity, remove } from './bag-economy-mart-flow.js';
import { resolveWoundedPokemon, WOUNDED_HEALING_ITEM_IDS } from './mapless-wounded-pokemon-flow.js';
import { applyWoundedHappinessEffect, resolveWoundedHealingItemEffect } from './wounded-healing-item-effect.js';

function cloneSlots(slots = []) {
  return slots.map((slot) => slot == null ? null : [slot[0], Number(slot[1])]);
}

function clonePokemon(pokemon) {
  if (!pokemon || typeof pokemon !== 'object' || Array.isArray(pokemon)) throw new TypeError('pokemon runtime is required');
  return structuredClone(pokemon);
}

export function resolveWoundedTreatmentRuntime(input = {}) {
  const itemId = String(input.itemId ?? '').toUpperCase();
  const originalSlots = cloneSlots(input.slots ?? []);
  const slots = cloneSlots(originalSlots);
  const pokemon = clonePokemon(input.pokemon);
  const party = Array.isArray(input.party) ? input.party.map((entry) => structuredClone(entry)) : [];
  const owned = quantity(slots, itemId);
  const allowlisted = WOUNDED_HEALING_ITEM_IDS.includes(itemId);
  const consumedAfterUse = input.consumedAfterUse !== false;
  const healingEntries = allowlisted && consumedAfterUse && owned > 0
    ? [{ item: itemId, quantity: owned, consumed_after_use: true }]
    : [];

  if (!allowlisted || owned <= 0 || !consumedAfterUse) {
    const eventResolution = resolveWoundedPokemon({
      event: input.event,
      party,
      species_exists: input.speciesExists !== false,
      choice: input.choice ?? 'treat',
      healing_entries: healingEntries,
      item_id: itemId,
      pokemon,
    });
    return { ...eventResolution, slots: originalSlots, pokemon, itemEffect: null, itemRemoved: false };
  }

  const itemEffect = resolveWoundedHealingItemEffect({
    itemId,
    hp: pokemon.hp,
    maxHp: pokemon.max_hp ?? pokemon.maxHp,
    status: pokemon.status ?? 'NONE',
  });

  const treatedPokemon = clonePokemon(pokemon);
  if (itemEffect.happiness_method && Number.isInteger(Number(treatedPokemon.happiness))) {
    treatedPokemon.happiness = applyWoundedHappinessEffect(Number(treatedPokemon.happiness), itemEffect.happiness_method);
  }

  const hpActuallyRaised = itemEffect.used === true && Number(itemEffect.hp_after) > Number(pokemon.hp);
  let itemRemoved = false;
  if (hpActuallyRaised) itemRemoved = remove(slots, itemId, 1);

  const eventResolution = resolveWoundedPokemon({
    event: input.event,
    party,
    species_exists: input.speciesExists !== false,
    choice: input.choice ?? 'treat',
    healing_entries: healingEntries,
    item_id: itemId,
    pokemon: treatedPokemon,
    heal_result: {
      used: itemEffect.used,
      hp_after: itemEffect.hp_after,
      status_after: itemEffect.status_after,
      happiness_method: itemEffect.happiness_method,
    },
    item_removed: itemRemoved,
  });

  const commit = eventResolution.outcome === 'joined' && itemRemoved;
  return {
    ...eventResolution,
    slots: commit ? slots : originalSlots,
    pokemon: eventResolution.joinedPokemon ?? pokemon,
    itemEffect,
    itemRemoved: commit,
  };
}
