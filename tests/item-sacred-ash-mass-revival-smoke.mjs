import assert from "node:assert/strict";
import { getPartyMassRevivalItemEffect } from "../runtime/item-party-mass-revival-effect.js";
import { getItemEffectSupportStatus } from "../runtime/item-effect-support-status.js";

const sacredAsh = getPartyMassRevivalItemEffect("SACREDASH");
assert.equal(sacredAsh.known, true);
assert.equal(sacredAsh.family, "party_mass_revival");
assert.equal(sacredAsh.target, "entire_player_party");
assert.equal(sacredAsh.useContext, "field_direct");
assert.equal(sacredAsh.eligibility.requirePartyPokemon, true);
assert.equal(sacredAsh.eligibility.requireAtLeastOneFaintedPartyPokemon, true);
assert.equal(sacredAsh.apply.affectEveryFaintedPartyPokemon, true);
assert.equal(sacredAsh.apply.healEachAffectedPokemonFully, true);
assert.equal(sacredAsh.apply.cureEachAffectedPokemonStatus, true);
assert.equal(sacredAsh.apply.useCanonicalPokemonHeal, true);
assert.equal(sacredAsh.consumeExactlyOnceOnSuccess, true);
assert.equal(sacredAsh.consumeOnFailure, false);
assert.equal(sacredAsh.battleUseAllowed, false);

const status = getItemEffectSupportStatus("SACREDASH");
assert.equal(status.status, "effect_mapped_owner_blocked");
assert.equal(status.family, "party_mass_revival");
assert.match(status.ownerNeeded, /Party roster mutation owner/);
assert.match(status.ownerNeeded, /consumes exactly once/);

assert.equal(getPartyMassRevivalItemEffect("MAXREVIVE").known, false);
console.log("Sacred Ash mass revival mapping smoke: ok");
