import assert from "node:assert/strict";
import { continueSafariTrainerAfterFirstKo } from "../runtime/safari-trainer-replacement-continuation.js";

const runtime = {
  player: { party: [{ species: "EEVEE", hp: 20, max_hp: 28 }] },
  variables: {
    mapless: {
      notice: "",
      last_operations: [],
      battle: {
        kind: "trainer",
        completed: false,
        decision: 0,
        captured: false,
        trainer: { trainer_full_name: "テストトレーナー" },
        trainer_party_index: 0,
        trainer_party: [
          { species: "RATTATA", hp: 0, max_hp: 12, moves: ["TACKLE"] },
          { species: "DWEBBLE", hp: 18, max_hp: 18, moves: ["TACKLE"] },
        ],
        foe: { species: "RATTATA", hp: 0, max_hp: 12, moves: ["TACKLE"] },
      },
    },
  },
};

const result = continueSafariTrainerAfterFirstKo(runtime, {
  decision: 0,
  operations: [
    { op: "reduce_hp", actor: "player", target: "foe", hpBefore: 5, hpAfter: 0 },
    { op: "faint", target: "foe" },
  ],
  presentation: [{ type: "faint", target: "foe" }],
  persistenceRequested: false,
});

const battle = runtime.variables.mapless.battle;
assert.equal(result.decision, 0);
assert.equal(result.foeReplacementApplied, true);
assert.equal(battle.completed, false);
assert.equal(battle.trainer_party_index, 1);
assert.equal(battle.foe.species, "DWEBBLE");
assert.equal(battle.foe.hp, 18);
assert.equal(battle.trainer_party[0].hp, 0);
assert.equal(battle.trainer_party[1].active, true);
assert.equal(battle.trainer_party[0].active, false);
assert.match(runtime.variables.mapless.notice, /DWEBBLE/);
assert.ok(result.operations.some((operation) => operation.source === "trainer_replacement_continuation"));

const noDouble = continueSafariTrainerAfterFirstKo(runtime, result);
assert.equal(noDouble.foeReplacementApplied, true);
assert.equal(runtime.variables.mapless.battle.trainer_party_index, 1);
assert.equal(runtime.variables.mapless.battle.foe.species, "DWEBBLE");

console.log("Safari two-Pokemon trainer first-KO continuation smoke: ok");
