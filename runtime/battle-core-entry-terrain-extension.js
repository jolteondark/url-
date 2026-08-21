import {
  battlePokemonAbilityIdCanonical,
  battlePokemonHeldItemIdCanonical,
} from "./battle-core-ability-item-modifiers.js";

const ENTRY_TERRAIN = Object.freeze({
  ELECTRICSURGE: "Electric",
  GRASSYSURGE: "Grassy",
  HADRONENGINE: "Electric",
  MISTYSURGE: "Misty",
  PSYCHICSURGE: "Psychic",
});

const TERRAIN_EXTENDER = "TERRAINEXTENDER";
const TERRAIN_SEEDS = Object.freeze({
  ELECTRICSEED: Object.freeze({ terrain: "Electric", stat: "DEFENSE" }),
  GRASSYSEED: Object.freeze({ terrain: "Grassy", stat: "DEFENSE" }),
  MISTYSEED: Object.freeze({ terrain: "Misty", stat: "SPECIAL_DEFENSE" }),
  PSYCHICSEED: Object.freeze({ terrain: "Psychic", stat: "SPECIAL_DEFENSE" }),
});

function terrainCanonical(value) {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "ELECTRIC") return "Electric";
  if (normalized === "GRASSY") return "Grassy";
  if (normalized === "MISTY") return "Misty";
  if (normalized === "PSYCHIC") return "Psychic";
  return null;
}

function resolveTerrainSeedCanonical({ item, effectiveTerrain }) {
  const seed = TERRAIN_SEEDS[item];
  if (!seed || seed.terrain !== effectiveTerrain) {
    return Object.freeze({
      triggered: false,
      item,
      terrain: effectiveTerrain,
      statChanges: Object.freeze([]),
      consumeRequest: null,
      consumeAfterSuccessfulStatRaise: true,
    });
  }
  return Object.freeze({
    triggered: true,
    item,
    terrain: effectiveTerrain,
    statChanges: Object.freeze([
      Object.freeze({ subject: "user", stat: seed.stat, delta: 1 }),
    ]),
    consumeRequest: Object.freeze({
      item,
      itemIsBerry: false,
      effectKind: "terrain_seed_stat",
      permanent: true,
    }),
    // Canonical Seeds don't activate at a capped stat stage. The shared hook
    // therefore exposes consumption as conditional on the existing stage
    // owner actually applying this +1 request.
    consumeAfterSuccessfulStatRaise: true,
  });
}

export function resolveEntryTerrainAbilityItemHookCanonical({ user = {}, context = {} } = {}) {
  const ability = battlePokemonAbilityIdCanonical(user);
  const item = battlePokemonHeldItemIdCanonical(user);
  const terrain = ENTRY_TERRAIN[ability] ?? null;
  // A terrain-changing entry Ability resolves before the holder's Seed. If no
  // entry terrain is produced, use the terrain that was already active.
  const effectiveTerrain = terrain ?? terrainCanonical(context?.effectiveTerrain ?? context?.terrain);
  const seedEffect = resolveTerrainSeedCanonical({ item, effectiveTerrain });

  if (!terrain) {
    return Object.freeze({
      boundary: "switch_in",
      ability,
      item,
      triggered: false,
      reason: "no_entry_terrain",
      terrainRequest: null,
      seedEffect,
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
    seedEffect,
  });
}

const TERRAIN_ITEM_IDS = Object.freeze([
  ...Object.keys(TERRAIN_SEEDS),
  TERRAIN_EXTENDER,
].sort());

export const BATTLE_ENTRY_TERRAIN_COVERAGE_CANONICAL = Object.freeze({
  abilityIds: Object.freeze(Object.keys(ENTRY_TERRAIN).sort()),
  itemIds: TERRAIN_ITEM_IDS,
  abilityCount: Object.keys(ENTRY_TERRAIN).length,
  itemCount: TERRAIN_ITEM_IDS.length,
  classificationCounts: Object.freeze({
    entryTerrainAbilities: Object.keys(ENTRY_TERRAIN).length,
    terrainDurationHeldItems: 1,
    terrainSeedHeldItems: Object.keys(TERRAIN_SEEDS).length,
  }),
});
