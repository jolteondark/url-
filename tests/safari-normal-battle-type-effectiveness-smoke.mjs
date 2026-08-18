import assert from "node:assert/strict";
import { resolveInitialTargetChecksCanonical } from "../runtime/battle-core-initial-target-checks.js";
import { resolveAccuracyDamageVerticalCanonical } from "../runtime/battle-core-accuracy-damage-vertical.js";
import { buildBrowserBattleActionInput } from "../runtime/browser-battle-round-runtime.js";
import {
  resolveCanonicalBattleTypingV108,
  resolveCanonicalTypeEffectivenessV108,
} from "../runtime/canonical-type-effectiveness-v108.js";
import {
  SAFARI_GENERAL_SPECIES_TYPE_METADATA_V108,
  safariGeneralMaterializedSpeciesTypeCountV108,
  safariGeneralPokemonTypesV108,
  safariGeneralSpeciesTypesV108,
} from "../runtime/safari-general-species-type-facts.js";

assert.equal(SAFARI_GENERAL_SPECIES_TYPE_METADATA_V108.speciesCount, 875);
assert.equal(SAFARI_GENERAL_SPECIES_TYPE_METADATA_V108.typeCount, 18);
assert.equal(safariGeneralMaterializedSpeciesTypeCountV108(), 0,
  "GENERAL species type facts must stay lazy before keyed access");
assert.deepEqual(new Set(safariGeneralSpeciesTypesV108("GASTLY")), new Set(["GHOST", "POISON"]));
assert.deepEqual(new Set(safariGeneralSpeciesTypesV108("DIGLETT")), new Set(["GROUND"]));
assert.deepEqual(new Set(safariGeneralSpeciesTypesV108("PARASECT")), new Set(["BUG", "GRASS"]));
assert.deepEqual(new Set(safariGeneralPokemonTypesV108({ species: "WORMADAM", form: 1 })), new Set(["BUG", "GROUND"]));
assert.deepEqual(new Set(safariGeneralPokemonTypesV108({ species: "WORMADAM", form: 2 })), new Set(["BUG", "STEEL"]));

assert.equal(resolveCanonicalTypeEffectivenessV108("FIRE", ["GRASS"]).multiplier, 2);
assert.equal(resolveCanonicalTypeEffectivenessV108("FIRE", ["WATER"]).multiplier, 0.5);
assert.equal(resolveCanonicalTypeEffectivenessV108("FIRE", ["BUG", "GRASS"]).multiplier, 4);
assert.equal(resolveCanonicalBattleTypingV108("FIRE", ["FIRE"], ["GRASS"]).stabMultiplier, 1.5);
assert.equal(resolveCanonicalBattleTypingV108("NORMAL", ["FIRE"], ["GRASS"]).stabMultiplier, 1);
assert.equal(resolveCanonicalBattleTypingV108("NORMAL", ["NORMAL"], ["GHOST", "POISON"]).immune, true);
assert.equal(resolveCanonicalBattleTypingV108("ELECTRIC", ["ELECTRIC"], ["GROUND"]).immune, true);

function pokemon(species, form = 0, hp = 100) {
  return {
    species, form, level: 50, hp, max_hp: hp,
    stats: { ATTACK: 100, DEFENSE: 100, SPECIAL_ATTACK: 100, SPECIAL_DEFENSE: 100, SPEED: 100 },
    moves: [{ id: "TESTMOVE", pp: 10, ppup: 0 }],
  };
}
function move(type) {
  return { id: "TESTMOVE", name: "Test Move", category: "Physical", power: 80, accuracy: 100, total_pp: 10, priority: 0, type };
}
function action(actorSpecies, targetSpecies, moveType, actorForm = 0, targetForm = 0) {
  return buildBrowserBattleActionInput({
    actor: pokemon(actorSpecies, actorForm),
    target: pokemon(targetSpecies, targetForm),
    move: move(moveType),
    moveIndex: 0,
    battlerIndex: 0,
    targetBattlerIndex: 1,
    randomRoll: 0,
    reflectPp: false,
  });
}

const fireGrass = action("CHARMANDER", "ODDISH", "FIRE");
assert.equal(fireGrass.damageInput.damageMultiplierInput.userHasType, true);
assert.equal(fireGrass.damageInput.damageMultiplierInput.typeMod, 2);

const fireWater = action("CHARMANDER", "SQUIRTLE", "FIRE");
assert.equal(fireWater.damageInput.damageMultiplierInput.typeMod, 0.5);

const fireDual = action("CHARMANDER", "PARASECT", "FIRE");
assert.equal(fireDual.damageInput.damageMultiplierInput.typeMod, 4);

const nonStab = action("CHARMANDER", "ODDISH", "NORMAL");
assert.equal(nonStab.damageInput.damageMultiplierInput.userHasType, false);
assert.equal(nonStab.typeEffectivenessResolution.stabMultiplier, 1);

function assertImmuneNoDamage(actorSpecies, targetSpecies, moveType) {
  const prepared = action(actorSpecies, targetSpecies, moveType);
  assert.equal(prepared.damageInput, undefined,
    "immune move must not feed typeMod=0 into the min-1 damage owner");
  const checked = resolveInitialTargetChecksCanonical(prepared);
  assert.equal(checked.initialTargetCheckResolutions[0].success, false);
  assert.equal(checked.initialTargetCheckResolutions[0].reason, "type_immunity");
  const resolved = resolveAccuracyDamageVerticalCanonical(checked);
  assert.equal(resolved.calculatedDamage, undefined);
  assert.equal(resolved.hpBefore, 100, "immune target HP must remain unchanged");
}

assertImmuneNoDamage("RATTATA", "GASTLY", "NORMAL");
assertImmuneNoDamage("PIKACHU", "DIGLETT", "ELECTRIC");

console.log("Safari direct-normal Battle canonical types: 875 coverage, STAB, 0/.5/2/4 effectiveness and immunity gate: ok");
