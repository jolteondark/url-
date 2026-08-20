import assert from "node:assert/strict";
import {
  BATTLE_ENTRY_TERRAIN_COVERAGE_CANONICAL,
  resolveEntryTerrainAbilityItemHookCanonical,
} from "../runtime/battle-core-entry-terrain-extension.js";
import {
  BATTLE_ABILITY_ITEM_SHARED_IMPLEMENTED_COVERAGE_CANONICAL,
  resolveBattleAbilityItemHookCanonical,
} from "../runtime/battle-ability-item-hook-dispatch.js";

const pokemon = (ability, heldItem = null) => ({
  ability,
  held_item: heldItem,
  item: heldItem,
  hp: 100,
  max_hp: 100,
});

const electric = resolveEntryTerrainAbilityItemHookCanonical({ user: pokemon("ELECTRICSURGE") });
assert.equal(electric.triggered, true);
assert.deepEqual(electric.terrainRequest, {
  terrain: "Electric",
  duration: 5,
  source: "ability",
  ability: "ELECTRICSURGE",
});

const extended = resolveEntryTerrainAbilityItemHookCanonical({ user: pokemon("ELECTRICSURGE", "TERRAINEXTENDER") });
assert.equal(extended.terrainRequest.duration, 8);

assert.equal(resolveEntryTerrainAbilityItemHookCanonical({ user: pokemon("GRASSYSURGE") }).terrainRequest.terrain, "Grassy");
assert.equal(resolveEntryTerrainAbilityItemHookCanonical({ user: pokemon("HADRONENGINE") }).terrainRequest.terrain, "Electric");
assert.equal(resolveEntryTerrainAbilityItemHookCanonical({ user: pokemon("MISTYSURGE") }).terrainRequest.terrain, "Misty");
assert.equal(resolveEntryTerrainAbilityItemHookCanonical({ user: pokemon("PSYCHICSURGE") }).terrainRequest.terrain, "Psychic");
for (const ability of ["GRASSYSURGE", "HADRONENGINE", "MISTYSURGE", "PSYCHICSURGE"]) {
  assert.equal(resolveEntryTerrainAbilityItemHookCanonical({ user: pokemon(ability, "TERRAINEXTENDER") }).terrainRequest.duration, 8);
}

const none = resolveEntryTerrainAbilityItemHookCanonical({ user: pokemon("OVERGROW", "TERRAINEXTENDER") });
assert.equal(none.triggered, false);
assert.equal(none.reason, "no_entry_terrain");
assert.equal(none.terrainRequest, null);

const staleExtender = resolveEntryTerrainAbilityItemHookCanonical({
  user: { ability: "ELECTRICSURGE", held_item: null, item: "TERRAINEXTENDER" },
});
assert.equal(staleExtender.terrainRequest.duration, 5);

const legacyExtender = resolveEntryTerrainAbilityItemHookCanonical({
  user: { ability_id: "ELECTRICSURGE", item: "TERRAINEXTENDER" },
});
assert.equal(legacyExtender.terrainRequest.duration, 8);

const shared = resolveBattleAbilityItemHookCanonical({
  hook: "switch_in",
  user: pokemon("PSYCHICSURGE", "TERRAINEXTENDER"),
  target: pokemon("NONE"),
});
assert.equal(shared.entryTerrain.triggered, true);
assert.equal(shared.entryTerrain.terrainRequest.terrain, "Psychic");
assert.equal(shared.entryTerrain.terrainRequest.duration, 8);

assert.deepEqual(BATTLE_ENTRY_TERRAIN_COVERAGE_CANONICAL.abilityIds, [
  "ELECTRICSURGE", "GRASSYSURGE", "HADRONENGINE", "MISTYSURGE", "PSYCHICSURGE",
]);
assert.deepEqual(BATTLE_ENTRY_TERRAIN_COVERAGE_CANONICAL.itemIds, ["TERRAINEXTENDER"]);
for (const id of BATTLE_ENTRY_TERRAIN_COVERAGE_CANONICAL.abilityIds) {
  assert.ok(BATTLE_ABILITY_ITEM_SHARED_IMPLEMENTED_COVERAGE_CANONICAL.abilityIds.includes(id));
}
assert.ok(BATTLE_ABILITY_ITEM_SHARED_IMPLEMENTED_COVERAGE_CANONICAL.itemIds.includes("TERRAINEXTENDER"));
assert.equal(BATTLE_ENTRY_TERRAIN_COVERAGE_CANONICAL.classificationCounts.entryTerrainAbilities, 5);
assert.equal(BATTLE_ENTRY_TERRAIN_COVERAGE_CANONICAL.classificationCounts.terrainDurationHeldItems, 1);

console.log("battle ability/item entry terrain smoke: PASS");
