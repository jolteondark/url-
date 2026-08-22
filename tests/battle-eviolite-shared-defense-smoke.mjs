import assert from "node:assert/strict";

import {
  BATTLE_EVIOLITE_DEFENSE_COVERAGE_CANONICAL,
  resolveEvioliteDefenseModifierCanonical,
} from "../runtime/battle-core-eviolite-defense-extension.js";

const physicalMove = Object.freeze({ id: "TACKLE", category: "Physical" });
const specialMove = Object.freeze({ id: "EMBER", category: "Special" });

function pokemon(overrides = {}) {
  return {
    species: "EEVEE",
    ability: "RUNAWAY",
    held_item: "EVIOLITE",
    item: "EVIOLITE",
    hp: 50,
    max_hp: 50,
    ...overrides,
  };
}

{
  const result = resolveEvioliteDefenseModifierCanonical({
    target: pokemon(),
    move: physicalMove,
    context: { targetCanEvolve: true },
  });
  assert.equal(result.triggered, true);
  assert.equal(result.item, "EVIOLITE");
  assert.equal(result.externalDefenseMultiplier, 1.5);
  assert.equal(result.appliesTo, "DEFENSE");
}

{
  const result = resolveEvioliteDefenseModifierCanonical({
    target: pokemon(),
    move: specialMove,
    context: { targetCanEvolve: true },
  });
  assert.equal(result.triggered, true);
  assert.equal(result.externalDefenseMultiplier, 1.5);
  assert.equal(result.appliesTo, "SPECIAL_DEFENSE");
}

for (const targetCanEvolve of [false, null, undefined]) {
  const result = resolveEvioliteDefenseModifierCanonical({
    target: pokemon(),
    move: physicalMove,
    context: { targetCanEvolve },
  });
  assert.equal(result.triggered, false);
  assert.equal(result.externalDefenseMultiplier, 1);
}

{
  const result = resolveEvioliteDefenseModifierCanonical({
    target: pokemon({ held_item: null, item: "EVIOLITE" }),
    move: physicalMove,
    context: { targetCanEvolve: true },
  });
  assert.equal(result.triggered, false, "canonical held_item=null must suppress stale item alias");
}

{
  const result = resolveEvioliteDefenseModifierCanonical({
    target: { species: "EEVEE", ability: "RUNAWAY", item: "EVIOLITE" },
    move: physicalMove,
    context: { targetCanEvolve: true },
  });
  assert.equal(result.triggered, true, "legacy objects without held_item retain compatibility fallback");
}

{
  const result = resolveEvioliteDefenseModifierCanonical({
    target: pokemon(),
    move: { id: "GROWL", category: "Status" },
    context: { targetCanEvolve: true },
  });
  assert.equal(result.triggered, false);
  assert.equal(result.externalDefenseMultiplier, 1);
}

assert.deepEqual(BATTLE_EVIOLITE_DEFENSE_COVERAGE_CANONICAL.itemIds, ["EVIOLITE"]);
assert.equal(BATTLE_EVIOLITE_DEFENSE_COVERAGE_CANONICAL.itemCount, 1);
assert.equal(BATTLE_EVIOLITE_DEFENSE_COVERAGE_CANONICAL.classificationCounts.evolutionConditionalDefenseHeldItems, 1);

console.log("battle Eviolite shared defense smoke: PASS");
