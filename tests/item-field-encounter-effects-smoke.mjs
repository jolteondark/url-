import assert from "node:assert/strict";
import { getFieldEncounterItemEffect } from "../runtime/item-field-encounter-effects.js";
import { getItemEffectSupportStatus } from "../runtime/item-effect-support-status.js";

const blackFlute = getFieldEncounterItemEffect("BLACKFLUTE");
assert.equal(blackFlute.known, true);
assert.equal(blackFlute.family, "wild_encounter_level_flute");
assert.equal(blackFlute.canonicalMechanicsGeneration, 9);
assert.equal(blackFlute.apply.setHigherLevelWildPokemon, true);
assert.equal(blackFlute.apply.setLowerLevelWildPokemon, false);
assert.equal(blackFlute.consumable, false);

const whiteFlute = getFieldEncounterItemEffect("WHITEFLUTE");
assert.equal(whiteFlute.known, true);
assert.equal(whiteFlute.apply.setLowerLevelWildPokemon, true);
assert.equal(whiteFlute.apply.setHigherLevelWildPokemon, false);
assert.equal(whiteFlute.consumable, false);

const honey = getFieldEncounterItemEffect("HONEY");
assert.equal(honey.known, true);
assert.equal(honey.family, "mapless_honey_wild_encounter");
assert.equal(honey.eligibility.requireActivePartyPokemon, true);
assert.equal(honey.apply.selectTypeFromCurrentDayRevealedWildBranches, true);
assert.equal(honey.apply.stableFallbackTypeFromCurrentDay, true);
assert.equal(honey.apply.startOrdinaryCapturableWildBattle, true);
assert.equal(honey.apply.battleModifier, 0);
assert.equal(honey.consumeOnSuccess, true);
assert.equal(honey.consumeOnFailure, false);

for (const id of ["BLACKFLUTE", "WHITEFLUTE", "HONEY"]) {
  const status = getItemEffectSupportStatus(id);
  assert.equal(status.status, "effect_mapped_owner_blocked");
}
assert.equal(getItemEffectSupportStatus("BLACKFLUTE").family, "wild_encounter_level_flute");
assert.match(getItemEffectSupportStatus("BLACKFLUTE").ownerNeeded, /wild-encounter level modifier/);
assert.equal(getItemEffectSupportStatus("HONEY").family, "mapless_honey_wild_encounter");
assert.match(getItemEffectSupportStatus("HONEY").ownerNeeded, /ordinary capturable wild battle owner/);

assert.equal(getFieldEncounterItemEffect("REPEL").known, false);
console.log("Field encounter item mappings smoke: ok");
