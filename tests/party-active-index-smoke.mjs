import assert from "node:assert/strict";
import {
  activePartyIndex,
  activePokemon,
  removePokemonAtIndex,
  copyStoredPokemon,
  moveStoredPokemon,
} from "../runtime/party-storage-management.js";

const mon = (id, hp = 10) => ({ id, hp });

{
  const state = { party: [mon("A"), mon("B"), mon("C")], active_index: 2, boxes: [] };
  assert.equal(activePartyIndex(state), 2);
  assert.equal(activePokemon(state).id, "C");
  const result = removePokemonAtIndex(state, 0);
  assert.equal(result.result, true);
  assert.equal(result.state.active_index, 1);
  assert.equal(activePokemon(result.state).id, "C");
}

{
  const state = { party: [mon("A"), mon("B"), mon("C")], active_index: 1, boxes: [] };
  const result = removePokemonAtIndex(state, 1);
  assert.equal(result.result, true);
  assert.equal(result.state.active_index, 1);
  assert.equal(activePokemon(result.state).id, "C");
}

{
  const state = { party: [mon("A"), mon("B")], active_index: 1, boxes: [{ slots: [] }] };
  const result = moveStoredPokemon(state, { boxDst: 0, boxSrc: -1, indexSrc: 0 });
  assert.equal(result.result, true);
  assert.equal(result.state.active_index, 0);
  assert.equal(activePokemon(result.state).id, "B");
  assert.equal(result.state.boxes[0].slots[0].id, "A");
}

{
  const state = { party: [], active_index: -1, boxes: [{ slots: [mon("BOX")] }] };
  const result = copyStoredPokemon(state, { boxDst: -1, boxSrc: 0, indexSrc: 0 });
  assert.equal(result.result, true);
  assert.equal(result.destination.index, 0);
  assert.equal(result.state.active_index, 0);
  assert.equal(activePokemon(result.state).id, "BOX");
}

{
  const state = { party: [mon("A")], active_index: 99, boxes: [] };
  assert.equal(activePartyIndex(state), 0);
  assert.equal(activePokemon(state).id, "A");
  assert.equal(activePartyIndex({ party: [], active_index: 0, boxes: [] }), -1);
}

console.log("party active index smoke: PASS");
