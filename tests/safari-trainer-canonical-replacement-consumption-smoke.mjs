import assert from "node:assert/strict";
import { continueSafariTrainerAfterFirstKo } from "../runtime/safari-trainer-replacement-continuation.js";

const runtime = {
  player: { party: [{ species: "PLAYER", hp: 30, max_hp: 30 }] },
  variables: { mapless: { last_operations: [], battle: {
    kind: "trainer",
    completed: false,
    decision: 0,
    captured: false,
    trainer: { trainer_full_name: "Trainer" },
    trainer_party: [
      { species: "LEAD", hp: 20, max_hp: 20, moves: [] },
      { species: "RESERVE_A", hp: 25, max_hp: 25, moves: [] },
      { species: "RESERVE_B", hp: 30, max_hp: 30, moves: [] },
    ],
    // Legacy Safari has already advanced to the next sequential slot here.
    trainer_party_index: 1,
    foe: { species: "RESERVE_A", hp: 25, max_hp: 25, moves: [] },
    trainer_party_order: null,
    last_operations: [],
    presentation: [],
  } } },
};

const result = continueSafariTrainerAfterFirstKo(runtime, {
  decision: 0,
  operations: [
    { op: "reduce_hp", target: "foe", hpAfter: 0 },
    { op: "faint", target: "foe" },
    { op: "trainer_send_next", partyIndex: 1, species: "RESERVE_A" },
  ],
  presentation: [
    { type: "faint", target: "foe" },
    { type: "trainer_next", actor: "foe", species: "RESERVE_A", partyIndex: 1 },
  ],
  persistenceRequested: false,
});

assert.equal(result.foeReplacementApplied, true);
assert.equal(runtime.variables.mapless.battle.trainer_party[0].hp, 0);
assert.equal(runtime.variables.mapless.battle.trainer_party[0].fainted, true);
assert.notEqual(runtime.variables.mapless.battle.trainer_party_index, 0);
assert.ok(runtime.variables.mapless.battle.foe.hp > 0);
assert.equal(result.operations.some((operation) => operation.op === "trainer_send_next"), false);
assert.equal(result.presentation.filter((event) => event.type === "trainer_next").length, 1);
console.log(JSON.stringify({ ok: true, active: runtime.variables.mapless.battle.trainer_party_index, species: runtime.variables.mapless.battle.foe.species }));
