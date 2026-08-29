import assert from "node:assert/strict";
import {
  isPartyRevivalItem,
  isPartyRevivalItemUsableInContext,
  partyRevivalItemCanAffectParty,
  resolvePartyRevivalItemEffect,
} from "../runtime/item-party-revival-effects.js";

const moveMasters = {
  TACKLE: { total_pp: 35 },
  GROWL: { total_pp: 40 },
};

const fainted = {
  species: "PIKACHU",
  hp: 0,
  max_hp: 101,
  status: "POISON",
  status_count: 2,
  steps_to_hatch: 0,
  moves: [
    { id: "TACKLE", pp: 0, ppup: 0 },
    { id: "GROWL", pp: 1, ppup: 3 },
  ],
};
const alive = {
  species: "EEVEE",
  hp: 10,
  max_hp: 100,
  status: "BURN",
  steps_to_hatch: 0,
  moves: [{ id: "TACKLE", pp: 1, ppup: 0 }],
};
const egg = {
  species: "TOGEPI",
  hp: 0,
  max_hp: 20,
  status: null,
  steps_to_hatch: 500,
  moves: [{ id: "GROWL", pp: 0, ppup: 0 }],
};

assert.equal(isPartyRevivalItem("sacredash"), true);
assert.equal(isPartyRevivalItem("revive"), false);
assert.equal(isPartyRevivalItemUsableInContext("SACREDASH", "field"), true);
assert.equal(isPartyRevivalItemUsableInContext("SACREDASH", "battle"), false);
assert.equal(partyRevivalItemCanAffectParty({ itemId: "SACREDASH", party: [alive, fainted, egg] }), true);
assert.equal(partyRevivalItemCanAffectParty({ itemId: "SACREDASH", party: [alive, egg] }), false);

const effect = resolvePartyRevivalItemEffect({ itemId: "SACREDASH", party: [alive, fainted, egg], moveMasters });
assert.equal(effect.used, true);
assert.equal(effect.result, "used");
assert.equal(effect.consumable, true);
assert.equal(effect.targets.length, 1);
assert.equal(effect.targets[0].partyIndex, 1);
assert.equal(effect.targets[0].hpBefore, 0);
assert.equal(effect.targets[0].hpAfter, 101);
assert.equal(effect.targets[0].statusBefore, "POISON");
assert.equal(effect.targets[0].statusAfter, null);
assert.equal(effect.targets[0].moves[0].pp, 35);
assert.equal(effect.targets[0].moves[1].pp, 64);
assert.equal(alive.hp, 10);
assert.equal(alive.status, "BURN");
assert.equal(alive.moves[0].pp, 1);

assert.equal(resolvePartyRevivalItemEffect({ itemId: "SACREDASH", party: [alive], moveMasters }).result, "no_effect");
assert.equal(resolvePartyRevivalItemEffect({ itemId: "SACREDASH", party: [], moveMasters }).result, "no_pokemon");
assert.equal(resolvePartyRevivalItemEffect({ itemId: "SACREDASH", party: [fainted], moveMasters, context: "battle" }).result, "unsupported_context");
assert.equal(resolvePartyRevivalItemEffect({ itemId: "POTION", party: [fainted], moveMasters }).result, "unsupported_item");

console.log("item party revival effects smoke: ok");
