import assert from "node:assert/strict";
import {
  BATTLE_ABILITY_ITEM_SHARED_HOOK_CONTRACT_CANONICAL,
  resolveBattleAbilityItemHookCanonical,
} from "../runtime/battle-ability-item-hook-dispatch.js";

const pokemon = (ability = "NONE") => ({
  ability,
  held_item: null,
  status: "NONE",
  hp: 100,
  max_hp: 100,
  types: ["NORMAL"],
  stats: { ATTACK: 100, DEFENSE: 100, SPECIAL_ATTACK: 100, SPECIAL_DEFENSE: 100, SPEED: 100 },
});

const coverage = BATTLE_ABILITY_ITEM_SHARED_HOOK_CONTRACT_CANONICAL.implementedCoverage;
assert.ok(coverage.abilityIds.includes("SOLIDROCK"), "Solid Rock must remain counted in shared implemented coverage");

const result = resolveBattleAbilityItemHookCanonical({
  hook: "action_before",
  user: pokemon("NONE"),
  target: pokemon("SOLIDROCK"),
  move: { id: "BRICKBREAK", type: "FIGHTING", category: "Physical", power: 75 },
  selectedMoveId: "BRICKBREAK",
  context: { typeMod: 2 },
});
assert.equal(result.modifiers.damageMultiplierInput.externalFinalDamageMultiplier, 0.75);

console.log("battle ability/item Solid Rock coverage smoke: PASS");
