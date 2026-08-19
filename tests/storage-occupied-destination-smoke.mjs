import assert from "node:assert/strict";
import { moveStoredPokemon } from "../runtime/party-storage-management.js";

const source = { species: "PIKACHU", hp: 20 };
const resident = { species: "EEVEE", hp: 18 };
const initial = {
  party: [{ species: "BULBASAUR", hp: 24 }],
  boxes: [{ capacity: 30, slots: [source, resident] }],
};

const moved = moveStoredPokemon(initial, {
  boxSrc: 0,
  indexSrc: 0,
  boxDst: 0,
  indexDst: 1,
});

assert.equal(moved.result, false, "occupied destination must reject instead of overwriting");
assert.equal(moved.operations?.[0]?.reason, "destination_occupied");
assert.deepEqual(moved.state.boxes[0].slots[0], source, "source Pokémon must remain in place");
assert.deepEqual(moved.state.boxes[0].slots[1], resident, "destination Pokémon must remain intact");

const freeMove = moveStoredPokemon(initial, {
  boxSrc: 0,
  indexSrc: 0,
  boxDst: 0,
  indexDst: 2,
});
assert.equal(freeMove.result, true, "move to an empty destination should still succeed");
assert.equal(freeMove.state.boxes[0].slots[0], null);
assert.deepEqual(freeMove.state.boxes[0].slots[2], source);
assert.deepEqual(freeMove.state.boxes[0].slots[1], resident);

console.log("storage occupied destination smoke: PASS");
