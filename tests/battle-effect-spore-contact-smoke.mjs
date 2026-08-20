import assert from "node:assert/strict";
import {
  BATTLE_CONTACT_REACTIVE_COVERAGE_CANONICAL,
  resolveContactReactiveAbilityItemHookCanonical,
} from "../runtime/battle-core-contact-reactive-extension.js";

const pokemon = (ability = "NONE", heldItem = null, extra = {}) => ({
  ability,
  held_item: heldItem,
  hp: 100,
  max_hp: 100,
  types: ["NORMAL"],
  ...extra,
});

const contactMove = { id: "TACKLE", category: "Physical", contact: true };

{
  const result = resolveContactReactiveAbilityItemHookCanonical({
    user: pokemon("NONE"),
    target: pokemon("EFFECTSPORE"),
    move: contactMove,
    damageDealt: 20,
  });
  assert.equal(result.triggered, true);
  assert.equal(result.effectSporeStatusChanceRequest?.subject, "user");
  assert.equal(result.effectSporeStatusChanceRequest?.chance, 30);
  assert.deepEqual(result.effectSporeStatusChanceRequest?.statuses, ["SLEEP", "PARALYSIS", "POISON"]);
  assert.equal(result.effectSporeStatusChanceRequest?.selection, "canonical_effect_spore");
  assert.equal(result.effectSporeStatusChanceRequest?.source, "EFFECTSPORE");
}

for (const user of [
  pokemon("NONE", null, { types: ["GRASS"] }),
  pokemon("OVERCOAT"),
  pokemon("NONE", "SAFETYGOGGLES"),
  pokemon("NONE", "PROTECTIVEPADS"),
]) {
  const result = resolveContactReactiveAbilityItemHookCanonical({
    user,
    target: pokemon("EFFECTSPORE"),
    move: contactMove,
    damageDealt: 20,
  });
  assert.equal(result.effectSporeStatusChanceRequest, null);
}

{
  const miss = resolveContactReactiveAbilityItemHookCanonical({
    user: pokemon("NONE"),
    target: pokemon("EFFECTSPORE"),
    move: contactMove,
    damageDealt: 0,
    context: { hit: false },
  });
  assert.equal(miss.effectSporeStatusChanceRequest, null);

  const nonContact = resolveContactReactiveAbilityItemHookCanonical({
    user: pokemon("NONE"),
    target: pokemon("EFFECTSPORE"),
    move: { ...contactMove, contact: false },
    damageDealt: 20,
  });
  assert.equal(nonContact.effectSporeStatusChanceRequest, null);
}

assert.ok(BATTLE_CONTACT_REACTIVE_COVERAGE_CANONICAL.abilityIds.includes("EFFECTSPORE"));
assert.equal(BATTLE_CONTACT_REACTIVE_COVERAGE_CANONICAL.classificationCounts.multiStatusContactAbilities, 1);

console.log("battle Effect Spore contact smoke: PASS");
