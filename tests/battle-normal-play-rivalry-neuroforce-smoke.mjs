import assert from "node:assert/strict";
import {
  BATTLE_ABILITY_ITEM_NORMAL_PLAY_EXTENSION_COVERAGE_CANONICAL,
  resolveNormalPlayActionBeforeAbilityItemExtensionCanonical,
} from "../runtime/battle-core-ability-item-normal-play-extension.js";

function pokemon({ ability = null, abilityId = undefined, gender = undefined } = {}) {
  return {
    ...(abilityId !== undefined ? { ability_id: abilityId } : {}),
    ability,
    held_item: null,
    gender,
    status: "NONE",
    hp: 100,
    max_hp: 100,
    species: "EEVEE",
  };
}

const tackle = Object.freeze({ id: "TACKLE", type: "NORMAL", category: "Physical", power: 40, priority: 0 });

function resolve({ user, target, move = tackle, typeMod = 1 } = {}) {
  return resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({
    user,
    target,
    move,
    context: { typeMod },
  });
}

{
  const same = resolve({
    user: pokemon({ ability: "RIVALRY", gender: "MALE" }),
    target: pokemon({ gender: "MALE" }),
  });
  assert.equal(same.damageMultiplierInput.externalPowerMultiplier, 1.25);

  const opposite = resolve({
    user: pokemon({ ability: "RIVALRY", gender: 0 }),
    target: pokemon({ gender: 1 }),
  });
  assert.equal(opposite.damageMultiplierInput.externalPowerMultiplier, 0.75);

  const genderless = resolve({
    user: pokemon({ ability: "RIVALRY", gender: "MALE" }),
    target: pokemon({ gender: 2 }),
  });
  assert.equal(genderless.damageMultiplierInput.externalPowerMultiplier, 1);
}

{
  const superEffective = resolve({
    user: pokemon({ ability: "NEUROFORCE" }),
    target: pokemon(),
    typeMod: 2,
  });
  assert.equal(superEffective.damageMultiplierInput.externalFinalDamageMultiplier, 1.25);

  const doubleWeakness = resolve({
    user: pokemon({ ability: "NEUROFORCE" }),
    target: pokemon(),
    typeMod: 4,
  });
  assert.equal(doubleWeakness.damageMultiplierInput.externalFinalDamageMultiplier, 1.25);

  const neutral = resolve({
    user: pokemon({ ability: "NEUROFORCE" }),
    target: pokemon(),
    typeMod: 1,
  });
  assert.equal(neutral.damageMultiplierInput.externalFinalDamageMultiplier, 1);
}

{
  const staleAlias = resolve({
    user: { ...pokemon({ ability: null, gender: "MALE" }), ability_id: "RIVALRY" },
    target: pokemon({ gender: "MALE" }),
  });
  assert.equal(staleAlias.damageMultiplierInput.externalPowerMultiplier, 1, "canonical ability=null must suppress stale ability_id");

  const legacy = resolve({
    user: { ability_id: "RIVALRY", held_item: null, gender: "FEMALE", status: "NONE", hp: 100, max_hp: 100, species: "EEVEE" },
    target: pokemon({ gender: "FEMALE" }),
  });
  assert.equal(legacy.damageMultiplierInput.externalPowerMultiplier, 1.25, "legacy objects without an ability field keep compatibility fallback");
}

assert.ok(BATTLE_ABILITY_ITEM_NORMAL_PLAY_EXTENSION_COVERAGE_CANONICAL.abilityIds.includes("RIVALRY"));
assert.ok(BATTLE_ABILITY_ITEM_NORMAL_PLAY_EXTENSION_COVERAGE_CANONICAL.abilityIds.includes("NEUROFORCE"));
assert.equal(BATTLE_ABILITY_ITEM_NORMAL_PLAY_EXTENSION_COVERAGE_CANONICAL.classificationCounts.genderPowerModifierAbilities, 1);
assert.equal(BATTLE_ABILITY_ITEM_NORMAL_PLAY_EXTENSION_COVERAGE_CANONICAL.classificationCounts.superEffectiveDamageBoostAbilities, 1);

console.log("battle normal-play Rivalry/Neuroforce smoke: PASS");
