import assert from "node:assert/strict";
import { projectOwnedOpponentRoundInputCanonical } from "../runtime/browser-battle-owned-opponent-state-handoff.js";

const player = { species: "PLAYER", hp: 17 };
const foe = { species: "FOE", hp: 9 };
const playerParty = [{ species: "RESERVE" }, player];
const foeParty = [foe, { species: "FOE_RESERVE" }];
const moveMasters = { TACKLE: { id: "TACKLE" } };
const postBattlePersistenceInput = { party: playerParty, marker: "terminal-state" };

const projected = projectOwnedOpponentRoundInputCanonical({
  player,
  foe,
  playerParty,
  foeParty,
  playerActivePartyIndex: 1,
  foeActivePartyIndex: 0,
  selectedMoveId: "TACKLE",
  moveMasters,
  combatRandomSeed: 123,
  priorityRandomSeed: 456,
  playerRandomRoll: 7,
  foeRandomRoll: 8,
  postBattlePersistenceInput,
  reflectedPartyIndex: 1,
}, { moveId: "TACKLE" });

assert.equal(projected.player, player);
assert.equal(projected.foe, foe);
assert.equal(projected.playerParty, playerParty);
assert.equal(projected.foeParty, foeParty);
assert.equal(projected.playerActivePartyIndex, 1);
assert.equal(projected.foeActivePartyIndex, 0);
assert.equal(projected.selectedMoveId, "TACKLE");
assert.equal(projected.foeMoveId, "TACKLE");
assert.equal(projected.moveMasters, moveMasters);
assert.equal(projected.combatRandomSeed, 123);
assert.equal(projected.priorityRandomSeed, 456);
assert.equal(projected.playerRandomRoll, 7);
assert.equal(projected.foeRandomRoll, 8);
assert.equal(projected.postBattlePersistenceInput, postBattlePersistenceInput);
assert.equal(projected.reflectedPartyIndex, 1);

console.log(JSON.stringify({
  ok: true,
  playerActivePartyIndex: projected.playerActivePartyIndex,
  foeActivePartyIndex: projected.foeActivePartyIndex,
  combatRandomSeed: projected.combatRandomSeed,
  priorityRandomSeed: projected.priorityRandomSeed,
  postBattlePersistenceForwarded: projected.postBattlePersistenceInput === postBattlePersistenceInput,
}));
