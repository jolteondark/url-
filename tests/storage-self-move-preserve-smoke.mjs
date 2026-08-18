import assert from "node:assert/strict";
import { moveStoredPokemon } from "../runtime/party-storage-management.js";

const pokemon = {
  species: "PIKACHU",
  hp: 17,
  max_hp: 20,
  status: "NONE",
  moves: [{ id: "THUNDERSHOCK", pp: 12, total_pp: 30 }],
};

const initial = {
  party: [],
  active_index: -1,
  boxes: [{ name: "Box 1", capacity: 30, slots: [pokemon, null] }],
  currentBox: 0,
};

const sameSlot = moveStoredPokemon(initial, {
  boxSrc: 0,
  indexSrc: 0,
  boxDst: 0,
  indexDst: 0,
});

assert.equal(sameSlot.result, true);
assert.deepEqual(sameSlot.destination, { box: 0, index: 0 });
assert.deepEqual(sameSlot.state.boxes[0].slots[0], pokemon);
assert.equal(sameSlot.state.boxes[0].slots.filter(Boolean).length, 1);
assert.equal(sameSlot.operations.at(-1)?.op, "move_noop");
assert.deepEqual(initial.boxes[0].slots[0], pokemon, "input state must stay immutable");

const moved = moveStoredPokemon(initial, {
  boxSrc: 0,
  indexSrc: 0,
  boxDst: 0,
  indexDst: 1,
});

assert.equal(moved.result, true);
assert.equal(moved.state.boxes[0].slots[0], null);
assert.deepEqual(moved.state.boxes[0].slots[1], pokemon);
assert.equal(moved.state.boxes[0].slots.filter(Boolean).length, 1);

console.log("storage-self-move-preserve-smoke: PASS");
