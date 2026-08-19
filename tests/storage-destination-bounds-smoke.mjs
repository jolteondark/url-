import assert from "node:assert/strict";
import { copyStoredPokemon, moveStoredPokemon } from "../runtime/party-storage-management.js";

const mon = (id) => ({ id, hp: 10 });

{
  const state = {
    party: [mon("A"), mon("ALLY")],
    active_index: 0,
    boxes: [{ capacity: 1, slots: [] }],
  };
  const result = moveStoredPokemon(state, {
    boxSrc: -1,
    indexSrc: 0,
    boxDst: 0,
    indexDst: 1,
  });
  assert.equal(result.result, false);
  assert.equal(result.operations[0].reason, "destination_index");
  assert.equal(result.state.party.length, 2);
  assert.deepEqual(result.state.party.map((pokemon) => pokemon.id), ["A", "ALLY"]);
  assert.equal(result.state.boxes[0].slots.length, 0);
}

{
  const state = {
    party: [mon("A")],
    active_index: 0,
    boxes: [{ capacity: 1, slots: [] }],
  };
  const result = copyStoredPokemon(state, {
    boxSrc: -1,
    indexSrc: 0,
    boxDst: 1,
    indexDst: 0,
  });
  assert.equal(result.result, false);
  assert.equal(result.operations[0].reason, "destination_box");
  assert.equal(result.state.party[0].id, "A");
}

{
  const state = {
    party: [mon("A"), mon("ALLY")],
    active_index: 0,
    boxes: [{ capacity: 2, slots: [mon("B"), null] }],
  };
  const result = moveStoredPokemon(state, {
    boxSrc: -1,
    indexSrc: 0,
    boxDst: 0,
    indexDst: -1,
  });
  assert.equal(result.result, true);
  assert.deepEqual(result.destination, { box: 0, index: 1 });
  assert.deepEqual(result.state.party.map((pokemon) => pokemon.id), ["ALLY"]);
  assert.equal(result.state.active_index, 0);
  assert.equal(result.state.boxes[0].slots[0].id, "B");
  assert.equal(result.state.boxes[0].slots[1].id, "A");
}

console.log("storage destination bounds smoke: PASS");
