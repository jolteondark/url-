import {
  battlePokemonAbilityIdCanonical,
  battlePokemonHeldItemIdCanonical,
} from "./battle-core-ability-item-modifiers.js";

const ENTRY_TERRAIN = Object.freeze({
  ELECTRICSURGE: "Electric",
  GRASSYSURGE: "Grassy",
  MISTYSURGE: "Misty",
  PSYCHICSURGE: "Psychic",
});

const TERRAIN_EXTENDER = "TERRAINEXTENDER";

export function resolveEntryTerrainAbilityItemHookCanonical({ user = {} } = {}) {
  const ability = battlePokemonAbilityIdCanonical(user);
  const item = battlePokemonHeldItemIdCanonical(user);
  const terrain = ENTRY_TERRAIN[ability] ?? null;
  if (!terrain) {
    return Object.freeze({
      boundary: "switch_in",
      ability,
      item,
      triggered: false,
      reason: "no_entry_terrain",
      terrainRequest: null,
    });
  }

  return Object.freeze({
    boundary: "switch_in",
    ability,
    item,
    triggered: true,
    reason: "entry_terrain",
    terrainRequest: Object.freeze({
      terrain,
      duration: item === TERRAIN_EXTENDER ? 8 : 5,
      source: "ability",
      ability,
    }),
  });
}

export const BATTLE_ENTRY_TERRAIN_COVERAGE_CANONICAL = Object.freeze({
  abilityIds: Object.freeze(Object.keys(ENTRY_TERRAIN).sort()),
  itemIds: Object.freeze([TERRAIN_EXTENDER]),
  abilityCount: Object.keys(ENTRY_TERRAIN).length,
  itemCount: 1,
  classificationCounts: Object.freeze({
    entryTerrainAbilities: Object.keys(ENTRY_TERRAIN).length,
    terrainDurationHeldItems: 1,
  }),
});
