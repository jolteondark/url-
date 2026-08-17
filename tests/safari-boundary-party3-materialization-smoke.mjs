import assert from "node:assert/strict";
import { MAPLESS_BOUNDARY_LEADER_ORDER_V108 } from "../runtime/mapless-boundary-trial-leader-data-v108.js";
import { materializeSafariBoundaryParty3, boundaryTrialBaseLevelV108 } from "../runtime/safari-boundary-trial-party3.js";

assert.equal(boundaryTrialBaseLevelV108(10), 5);
for (const leaderId of MAPLESS_BOUNDARY_LEADER_ORDER_V108) {
  const trainer = materializeSafariBoundaryParty3({ leaderId, floor: 10 });
  assert.equal(trainer.party_size, 3);
  assert.equal(trainer.skill_level, 64);
  assert.equal(trainer.party.length, 3);
  assert.deepEqual(trainer.party.map((pokemon) => pokemon.level), [5, 5, 7]);
  for (const pokemon of trainer.party) {
    assert.equal(pokemon.nature_id, "HARDY");
    assert.equal(pokemon.form, 0);
    assert.equal(pokemon.shiny, false);
    assert.equal(pokemon.hp, pokemon.max_hp);
    assert.deepEqual(pokemon.iv, { HP:31, ATTACK:31, DEFENSE:31, SPECIAL_ATTACK:31, SPECIAL_DEFENSE:31, SPEED:31 });
    assert.deepEqual(pokemon.ev, { HP:0, ATTACK:0, DEFENSE:0, SPECIAL_ATTACK:0, SPECIAL_DEFENSE:0, SPEED:0 });
    assert.equal(pokemon.moves.length, 4);
    assert.ok(pokemon.moves.every((move) => Number.isInteger(move.pp) && move.pp > 0));
  }
}
console.log("Safari boundary party-3 materialization smoke: ok");
