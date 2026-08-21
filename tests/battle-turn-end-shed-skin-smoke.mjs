import assert from "node:assert/strict";
import {
  BATTLE_TURN_END_STATUS_ITEM_EXTENSION_COVERAGE_CANONICAL,
  resolveTurnEndStatusItemExtensionCanonical,
} from "../runtime/battle-core-turn-end-status-item-extension.js";

const pokemon = (overrides = {}) => ({
  ability: "SHEDSKIN",
  held_item: null,
  status: "PARALYSIS",
  hp: 80,
  max_hp: 100,
  ...overrides,
});

{
  const pending = resolveTurnEndStatusItemExtensionCanonical(pokemon(), {});
  assert.equal(pending.statusCureRequest, null);
  assert.deepEqual(pending.statusCureChanceRequest, {
    status: "PARALYSIS",
    source: "ability",
    ability: "SHEDSKIN",
    numerator: 1,
    denominator: 3,
  });
}
{
  const triggered = resolveTurnEndStatusItemExtensionCanonical(pokemon(), { shedSkinRoll: 0.2 });
  assert.equal(triggered.statusCureRequest?.ability, "SHEDSKIN");
  assert.equal(triggered.statusCureRequest?.status, "PARALYSIS");
  assert.equal(triggered.triggered, true);
}
{
  const missed = resolveTurnEndStatusItemExtensionCanonical(pokemon(), { shedSkinRoll: 0.8 });
  assert.equal(missed.statusCureRequest, null);
  assert.equal(missed.statusCureChanceRequest?.ability, "SHEDSKIN");
}
{
  const healthy = resolveTurnEndStatusItemExtensionCanonical(pokemon({ status: "NONE" }), { shedSkinRoll: 0 });
  assert.equal(healthy.statusCureRequest, null);
  assert.equal(healthy.statusCureChanceRequest, null);
}
{
  const staleAlias = resolveTurnEndStatusItemExtensionCanonical({
    ability: null,
    ability_id: "SHEDSKIN",
    held_item: null,
    status: "BURN",
    hp: 50,
    max_hp: 100,
  }, { shedSkinRoll: 0 });
  assert.equal(staleAlias.statusCureRequest, null);
  assert.equal(staleAlias.statusCureChanceRequest, null);
}
assert.equal(BATTLE_TURN_END_STATUS_ITEM_EXTENSION_COVERAGE_CANONICAL.abilityIds.includes("SHEDSKIN"), true);
assert.equal(BATTLE_TURN_END_STATUS_ITEM_EXTENSION_COVERAGE_CANONICAL.classificationCounts.probabilisticTurnEndStatusCureAbilities, 1);
console.log("battle turn-end Shed Skin smoke: PASS");
