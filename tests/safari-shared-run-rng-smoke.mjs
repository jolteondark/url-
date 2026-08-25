import assert from "node:assert/strict";
import {
  borrowSafariSharedRunRandomInt,
  nextSafariEncounterSpeciesIndex,
} from "../runtime/safari-encounter-randomization.js";

function runtimeWith(seed, counter = 0) {
  return {
    variables: {
      mapless: {
        preview_encounter_seed: seed >>> 0,
        preview_encounter_counter: counter,
      },
    },
  };
}

const encounter = runtimeWith(1);
assert.equal(
  nextSafariEncounterSpeciesIndex(encounter.variables.mapless, { day: 3, boardIndex: 2 }),
  297152615,
  "existing encounter stream output must remain unchanged while the owner is generalized",
);
assert.equal(encounter.variables.mapless.preview_encounter_counter, 1,
  "encounter draw must consume the shared persisted counter exactly once");

const sequential = runtimeWith(1);
const first = borrowSafariSharedRunRandomInt(sequential, 12);
const second = borrowSafariSharedRunRandomInt(sequential, 12);
assert.equal(sequential.variables.mapless.preview_encounter_counter, 2,
  "two accepted shared randomInt draws must advance the same persisted stream twice");
assert.notEqual(first, second,
  "sequential shared draws must not restart from the persisted seed");

const beforeContinue = runtimeWith(0x12345678);
const drawBeforeSave = borrowSafariSharedRunRandomInt(beforeContinue, 1000);
const saved = structuredClone(beforeContinue);
const expectedAfterSave = borrowSafariSharedRunRandomInt(beforeContinue, 1000);
const restored = structuredClone(saved);
const actualAfterContinue = borrowSafariSharedRunRandomInt(restored, 1000);
assert.equal(actualAfterContinue, expectedAfterSave,
  "Save/Continue must resume the shared run RNG from the persisted counter");
assert.equal(restored.variables.mapless.preview_encounter_counter, beforeContinue.variables.mapless.preview_encounter_counter,
  "continued draw must consume exactly the same next stream position");
assert.ok(Number.isInteger(drawBeforeSave));

const interleaved = runtimeWith(7);
borrowSafariSharedRunRandomInt(interleaved, 100);
assert.equal(interleaved.variables.mapless.preview_encounter_counter, 1);
nextSafariEncounterSpeciesIndex(interleaved.variables.mapless, { day: 1, boardIndex: 0 });
assert.equal(interleaved.variables.mapless.preview_encounter_counter, 2,
  "adapter borrowing and encounters must share one persisted stream owner");

assert.throws(() => borrowSafariSharedRunRandomInt(runtimeWith(1), 0), RangeError);
assert.throws(() => borrowSafariSharedRunRandomInt({}, 10), TypeError);

console.log("Safari shared run RNG borrowing / Save-Continue continuity smoke passed");
