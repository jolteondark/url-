import assert from "node:assert/strict";
import {
  BATTLE_TURN_END_STATUS_ITEM_EXTENSION_COVERAGE_CANONICAL,
  resolveTurnEndStatusItemExtensionCanonical,
} from "../runtime/battle-core-turn-end-status-item-extension.js";
import { commitBattleAbilityItemTurnEndRuntime } from "../runtime/battle-ability-item-turn-end-runtime.js";

const pokemon = (ability = null, heldItem = null, extra = {}) => ({
  ability,
  held_item: heldItem,
  item: heldItem,
  hp: 80,
  max_hp: 160,
  status: "NONE",
  status_count: 0,
  types: ["NORMAL"],
  stats: { ATTACK: 100, DEFENSE: 100, SPECIAL_ATTACK: 100, SPECIAL_DEFENSE: 100, SPEED: 100 },
  ...extra,
});

{
  const result = resolveTurnEndStatusItemExtensionCanonical(
    pokemon("HYDRATION", null, { status: "BURN", status_count: 2 }),
    { effectiveWeather: "Rain" },
  );
  assert.equal(result.triggered, true);
  assert.equal(result.hpDelta, 0);
  assert.deepEqual(result.statusCureRequest, {
    status: "BURN",
    source: "ability",
    ability: "HYDRATION",
  });
}

{
  const result = resolveTurnEndStatusItemExtensionCanonical(
    pokemon("HYDRATION", null, { status: "POISON" }),
    { effectiveWeather: "Sun" },
  );
  assert.equal(result.triggered, false);
  assert.equal(result.statusCureRequest, null);
}

{
  const result = resolveTurnEndStatusItemExtensionCanonical(
    pokemon(null, "STICKYBARB", { hp: 80, max_hp: 160 }),
  );
  assert.equal(result.triggered, true);
  assert.equal(result.hpDelta, -20);
  assert.equal(result.reason, "sticky_barb");
}

{
  const result = resolveTurnEndStatusItemExtensionCanonical(
    pokemon(null, null, { item: "STICKYBARB", hp: 80, max_hp: 160 }),
  );
  assert.equal(result.triggered, false, "canonical held_item=null must suppress stale legacy item alias");
}

{
  const result = commitBattleAbilityItemTurnEndRuntime({
    pokemon: pokemon("HYDRATION", "STICKYBARB", { hp: 80, max_hp: 160, status: "PARALYSIS", status_count: 3 }),
    context: { effectiveWeather: "Rain" },
  });
  assert.equal(result.pokemon.hp, 60);
  assert.equal(result.pokemon.status, "NONE");
  assert.equal(result.pokemon.status_count, 0);
  assert.equal(result.commit.statusCured, true);
  assert.equal(result.commit.statusCureRequest.ability, "HYDRATION");
}

assert.ok(BATTLE_TURN_END_STATUS_ITEM_EXTENSION_COVERAGE_CANONICAL.abilityIds.includes("HYDRATION"));
assert.ok(BATTLE_TURN_END_STATUS_ITEM_EXTENSION_COVERAGE_CANONICAL.itemIds.includes("STICKYBARB"));
assert.equal(BATTLE_TURN_END_STATUS_ITEM_EXTENSION_COVERAGE_CANONICAL.classificationCounts.turnEndStatusCureAbilities, 1);
assert.equal(BATTLE_TURN_END_STATUS_ITEM_EXTENSION_COVERAGE_CANONICAL.classificationCounts.turnEndDamageHeldItems, 1);

console.log("battle turn-end Hydration/Sticky Barb smoke: PASS");
