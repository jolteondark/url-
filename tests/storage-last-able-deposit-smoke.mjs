import assert from "node:assert/strict";
import { moveStoredPokemon } from "../runtime/party-storage-management.js";

const lastAble = { species: "PIKACHU", hp: 20 };
const fainted = { species: "EEVEE", hp: 0 };
const blocked = moveStoredPokemon({
  active_index: 0,
  party: [lastAble, fainted],
  boxes: [{ capacity: 30, slots: [] }],
}, {
  boxSrc: -1,
  indexSrc: 0,
  boxDst: 0,
  indexDst: 0,
});

assert.equal(blocked.result, false, "last able Pokémon must not be deposited into Storage");
assert.equal(blocked.operations?.[0]?.reason, "last_able");
assert.deepEqual(blocked.state.party, [lastAble, fainted], "rejected deposit must preserve the party");
assert.equal(blocked.state.boxes[0].slots[0], undefined, "rejected deposit must not duplicate into Storage");

const secondAble = { species: "BULBASAUR", hp: 15 };
const allowed = moveStoredPokemon({
  active_index: 0,
  party: [lastAble, secondAble],
  boxes: [{ capacity: 30, slots: [] }],
}, {
  boxSrc: -1,
  indexSrc: 0,
  boxDst: 0,
  indexDst: 0,
});

assert.equal(allowed.result, true, "deposit should succeed when another able Pokémon remains");
assert.deepEqual(allowed.state.party, [secondAble]);
assert.deepEqual(allowed.state.boxes[0].slots[0], lastAble);
assert.equal(allowed.state.active_index, 0, "active index must normalize onto the remaining party member");

console.log("storage last-able deposit smoke: PASS");
