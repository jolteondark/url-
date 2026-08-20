import assert from "node:assert/strict";
import {
  BATTLE_TYPE_IMMUNITY_AFTER_EFFECT_COVERAGE_CANONICAL,
  resolveTypeImmunityAfterEffectHookCanonical,
} from "../runtime/battle-core-type-immunity-after-effect-extension.js";

const target = (ability, hp = 40, maxHp = 100) => ({ ability, held_item: null, hp, max_hp: maxHp });
const immunity = (ability, afterEffect) => ({
  targetAbility: ability,
  immune: true,
  source: "ability_type_immunity",
  afterEffect,
});

{
  const result = resolveTypeImmunityAfterEffectHookCanonical({
    target: target("WATERABSORB", 40, 100),
    typeImmunityResolution: immunity("WATERABSORB", { kind: "heal", hpFraction: [1, 4] }),
  });
  assert.equal(result.triggered, true);
  assert.equal(result.hpDelta, 25);
  assert.deepEqual(result.statChanges, []);
  assert.equal(result.activation, null);
}

{
  const result = resolveTypeImmunityAfterEffectHookCanonical({
    target: target("VOLTABSORB", 90, 100),
    typeImmunityResolution: immunity("VOLTABSORB", { kind: "heal", hpFraction: [1, 4] }),
  });
  assert.equal(result.hpDelta, 10);
}

for (const [ability, stat, delta] of [
  ["STORMDRAIN", "SPECIAL_ATTACK", 1],
  ["LIGHTNINGROD", "SPECIAL_ATTACK", 1],
  ["MOTORDRIVE", "SPEED", 1],
  ["SAPSIPPER", "ATTACK", 1],
  ["WELLBAKEDBODY", "DEFENSE", 2],
]) {
  const result = resolveTypeImmunityAfterEffectHookCanonical({
    target: target(ability),
    typeImmunityResolution: immunity(ability, {
      kind: "stat_stage",
      changes: [{ subject: "target", stat, delta }],
    }),
  });
  assert.equal(result.triggered, true);
  assert.equal(result.hpDelta, 0);
  assert.deepEqual(result.statChanges, [{ subject: "target", stat, delta }]);
}

{
  const result = resolveTypeImmunityAfterEffectHookCanonical({
    target: target("FLASHFIRE"),
    typeImmunityResolution: immunity("FLASHFIRE", { kind: "activate", flag: "FLASH_FIRE" }),
  });
  assert.equal(result.triggered, true);
  assert.deepEqual(result.activation, { flag: "FLASH_FIRE" });
}

{
  const result = resolveTypeImmunityAfterEffectHookCanonical({
    target: target("LEVITATE"),
    typeImmunityResolution: { immune: true, targetAbility: "LEVITATE", afterEffect: null },
  });
  assert.equal(result.triggered, false);
}

{
  const result = resolveTypeImmunityAfterEffectHookCanonical({
    target: target("WATERABSORB"),
    typeImmunityResolution: { immune: false, targetAbility: "WATERABSORB", afterEffect: { kind: "heal", hpFraction: [1, 4] } },
  });
  assert.equal(result.triggered, false);
}

assert.equal(BATTLE_TYPE_IMMUNITY_AFTER_EFFECT_COVERAGE_CANONICAL.abilityCount, 10);
assert.equal(BATTLE_TYPE_IMMUNITY_AFTER_EFFECT_COVERAGE_CANONICAL.classificationCounts.hpAbsorb, 4);
assert.equal(BATTLE_TYPE_IMMUNITY_AFTER_EFFECT_COVERAGE_CANONICAL.classificationCounts.statStageAbsorb, 5);
assert.equal(BATTLE_TYPE_IMMUNITY_AFTER_EFFECT_COVERAGE_CANONICAL.classificationCounts.activationAbsorb, 1);

console.log("battle ability/item type-immunity after-effect smoke: PASS");
