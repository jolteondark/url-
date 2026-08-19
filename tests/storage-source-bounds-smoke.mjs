import assert from "node:assert/strict";
import { copyStoredPokemon, moveStoredPokemon } from "../runtime/party-storage-management.js";

const mon = (id) => ({ id, hp: 10 });

{
  const state = {
    party: [mon("A"), mon("ALLY")],
    active_index: 0,
    boxes: [{ capacity: 2, slots: [] }],
  };
  const result = moveStoredPokemon(state, {
    boxSrc: -2,
    indexSrc: 0,
    boxDst: 0,
    indexDst: 0,
  });
  assert.equal(result.result, false);
  assert.equal(result.operations[0].reason, "source_box");
  assert.deepEqual(result.state.party.map((pokemon) => pokemon.id), ["A", "ALLY"]);
  assert.equal(result.state.boxes[0].slots.length, 0);
}

{
  const state = {
    party: [mon("A")],
    active_index: 0,
    boxes: [{ capacity: 2, slots: [mon("B")] }],
  };
  const result = copyStoredPokemon(state, {
    boxSrc: 1,
    indexSrc: 0,
    boxDst: 0,
    indexDst: 1,
  });
  assert.equal(result.result, false);
  assert.equal(result.operations[0].reason, "source_box");
  assert.equal(result.state.boxes[0].slots[0].id, "B");
  assert.equal(result.state.boxes[0].slots[1], undefined);
}

{
  const state = {
    party: [mon("A")],
    active_index: 0,
    boxes: [{ capacity: 1, slots: [mon("B")] }],
  };
  const result = copyStoredPokemon(state, {
    boxSrc: 0,
    indexSrc: 1,
    boxDst: -1,
    indexDst: -1,
  });
  assert.equal(result.result, false);
  assert.equal(result.operations[0].reason, "source_index");
  assert.equal(result.state.party.length, 1);
  assert.equal(result.state.party[0].id, "A");
  assert.equal(result.state.boxes[0].slots[0].id, "B");
}

{
  const state = {
    party: [mon("A")],
    active_index: 0,
    boxes: [{ capacity: 2, slots: [mon("B"), null] }],
  };
  const result = moveStoredPokemon(state, {
    boxSrc: 0,
    indexSrc: 0,
    boxDst: -1,
    indexDst: -1,
  });
  assert.equal(result.result, true);
  assert.deepEqual(result.state.party.map((pokemon) => pokemon.id), ["A", "B"]);
  assert.equal(result.state.boxes[0].slots[0], null);
}

console.log("storage source bounds smoke: PASS");
