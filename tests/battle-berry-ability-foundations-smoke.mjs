import assert from "node:assert/strict";
import {
  BATTLE_BERRY_ABILITY_COVERAGE_CANONICAL,
  resolveBerryAbilityPreConsumptionCanonical,
  resolveBerryAbilityPostConsumptionCanonical,
} from "../runtime/battle-core-berry-ability-extension.js";

const pokemon = (ability, held_item, hp = 100, max_hp = 100, extra = {}) => ({
  ability,
  held_item,
  hp,
  max_hp,
  ...extra,
});

const dormantLiechi = Object.freeze({
  item: "LIECHIBERRY",
  triggered: false,
  heal: 0,
  statChanges: Object.freeze([]),
  consumeRequest: null,
  boundary: "action_after",
});
const gluttonyLiechi = resolveBerryAbilityPreConsumptionCanonical({
  pokemon: pokemon("GLUTTONY", "LIECHIBERRY", 50, 100),
  berryResolution: dormantLiechi,
});
assert.equal(gluttonyLiechi.triggered, true);
assert.deepEqual(gluttonyLiechi.statChanges, [{ subject: "user", stat: "ATTACK", delta: 1 }]);
assert.equal(gluttonyLiechi.consumeRequest.item, "LIECHIBERRY");
assert.equal(gluttonyLiechi.consumeRequest.permanent, true);

const ordinaryLiechi = resolveBerryAbilityPreConsumptionCanonical({
  pokemon: pokemon("NONE", "LIECHIBERRY", 50, 100),
  berryResolution: dormantLiechi,
});
assert.equal(ordinaryLiechi.triggered, false);

const ordinarySitrus = Object.freeze({
  item: "SITRUSBERRY",
  triggered: true,
  heal: 25,
  statChanges: Object.freeze([]),
  consumeRequest: Object.freeze({ item: "SITRUSBERRY", itemIsBerry: true, effectKind: "hp_restore", permanent: true }),
  boundary: "action_after",
});
const ripenSitrus = resolveBerryAbilityPreConsumptionCanonical({
  pokemon: pokemon("RIPEN", "SITRUSBERRY", 40, 100),
  berryResolution: ordinarySitrus,
});
assert.equal(ripenSitrus.heal, 50);

const ripenLiechi = resolveBerryAbilityPreConsumptionCanonical({
  pokemon: pokemon("RIPEN", "LIECHIBERRY", 20, 100),
  berryResolution: Object.freeze({
    item: "LIECHIBERRY",
    triggered: true,
    heal: 0,
    statChanges: Object.freeze([{ subject: "user", stat: "ATTACK", delta: 1 }]),
    consumeRequest: Object.freeze({ item: "LIECHIBERRY", itemIsBerry: true, effectKind: "stat_raise", permanent: true }),
    boundary: "action_after",
  }),
});
assert.deepEqual(ripenLiechi.statChanges, [{ subject: "user", stat: "ATTACK", delta: 2 }]);

const cheekPouch = resolveBerryAbilityPostConsumptionCanonical({
  pokemon: pokemon("CHEEKPOUCH", "SITRUSBERRY", 40, 100),
  berryResolution: ordinarySitrus,
});
assert.equal(cheekPouch.triggered, true);
assert.equal(cheekPouch.hpDelta, 33);

const noConsumption = resolveBerryAbilityPostConsumptionCanonical({
  pokemon: pokemon("CHEEKPOUCH", "SITRUSBERRY", 40, 100),
  berryResolution: { ...ordinarySitrus, triggered: false, consumeRequest: null },
});
assert.equal(noConsumption.triggered, false);
assert.equal(noConsumption.hpDelta, 0);

const staleAlias = resolveBerryAbilityPostConsumptionCanonical({
  pokemon: { ability: null, ability_id: "CHEEKPOUCH", held_item: null, item: "SITRUSBERRY", hp: 40, max_hp: 100 },
  berryResolution: ordinarySitrus,
});
assert.equal(staleAlias.triggered, false);

const legacy = resolveBerryAbilityPostConsumptionCanonical({
  pokemon: { ability_id: "CHEEKPOUCH", item: "SITRUSBERRY", hp: 40, max_hp: 100 },
  berryResolution: ordinarySitrus,
});
assert.equal(legacy.triggered, true);
assert.equal(legacy.hpDelta, 33);

assert.deepEqual(BATTLE_BERRY_ABILITY_COVERAGE_CANONICAL.abilityIds, ["CHEEKPOUCH", "GLUTTONY", "RIPEN"]);
assert.equal(BATTLE_BERRY_ABILITY_COVERAGE_CANONICAL.classificationCounts.earlyPinchBerryAbilities, 1);
assert.equal(BATTLE_BERRY_ABILITY_COVERAGE_CANONICAL.classificationCounts.berryEffectMultiplierAbilities, 1);
assert.equal(BATTLE_BERRY_ABILITY_COVERAGE_CANONICAL.classificationCounts.berryConsumptionHealAbilities, 1);

console.log("battle berry ability foundations smoke: PASS");
