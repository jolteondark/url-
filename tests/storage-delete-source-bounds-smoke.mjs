import assert from "node:assert/strict";
import { deleteStoredPokemon } from "../runtime/party-storage-management.js";

const baseState = {
  active_index: 0,
  party: [
    { id: "LEAD", hp: 20 },
    { id: "ALLY", hp: 15 },
  ],
  boxes: [
    { capacity: 2, slots: [{ id: "BOXED", hp: 8 }, null] },
  ],
};

const invalidNegativeBox = deleteStoredPokemon(baseState, -2, 0);
assert.equal(invalidNegativeBox.result, false);
assert.deepEqual(invalidNegativeBox.operations, [{ op: "delete_rejected", reason: "source_box" }]);
assert.deepEqual(invalidNegativeBox.state.party.map((pokemon) => pokemon.id), ["LEAD", "ALLY"]);
assert.equal(invalidNegativeBox.state.boxes[0].slots[0].id, "BOXED");

const missingBox = deleteStoredPokemon(baseState, 1, 0);
assert.equal(missingBox.result, false);
assert.deepEqual(missingBox.operations, [{ op: "delete_rejected", reason: "source_box" }]);
assert.deepEqual(missingBox.state.party.map((pokemon) => pokemon.id), ["LEAD", "ALLY"]);
assert.equal(missingBox.state.boxes[0].slots[0].id, "BOXED");

const invalidPartyIndex = deleteStoredPokemon(baseState, -1, -1);
assert.equal(invalidPartyIndex.result, false);
assert.deepEqual(invalidPartyIndex.operations, [{ op: "delete_rejected", reason: "source_index" }]);
assert.deepEqual(invalidPartyIndex.state.party.map((pokemon) => pokemon.id), ["LEAD", "ALLY"]);

const validBoxDelete = deleteStoredPokemon(baseState, 0, 0);
assert.equal(validBoxDelete.result, true);
assert.equal(validBoxDelete.state.boxes[0].slots[0], null);
assert.deepEqual(validBoxDelete.state.party.map((pokemon) => pokemon.id), ["LEAD", "ALLY"]);

console.log("storage-delete-source-bounds-smoke: PASS");
