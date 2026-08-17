import assert from "node:assert/strict";

import {
  SAFARI_MOVE_MASTERS,
  SAFARI_SPECIES_MASTERS,
  installSafariGeneralMasters,
} from "../runtime/safari-playable-data.js";

function countedProjection(entries) {
  let reads = 0;
  const target = Object.fromEntries(entries);
  return {
    proxy: new Proxy(target, {
      get(object, property, receiver) {
        if (typeof property === "string" && Object.prototype.hasOwnProperty.call(object, property)) reads += 1;
        return Reflect.get(object, property, receiver);
      },
    }),
    reads: () => reads,
  };
}

const species = countedProjection([
  ["LAZYMON_A", Object.freeze({ id: "LAZYMON_A", base_stats: Object.freeze({ HP: 1 }) })],
  ["LAZYMON_B", Object.freeze({ id: "LAZYMON_B", base_stats: Object.freeze({ HP: 2 }) })],
]);
const moves = countedProjection([
  ["LAZYMOVE_A", Object.freeze({ id: "LAZYMOVE_A", total_pp: 10 })],
  ["LAZYMOVE_B", Object.freeze({ id: "LAZYMOVE_B", total_pp: 20 })],
]);

const installed = installSafariGeneralMasters(species.proxy, moves.proxy);
assert.deepEqual(installed, { speciesCount: 2, moveCount: 2 });
assert.equal(species.reads(), 0, "install must not materialize every GENERAL species");
assert.equal(moves.reads(), 0, "install must not materialize every GENERAL move");
assert.ok(Object.keys(SAFARI_SPECIES_MASTERS).includes("LAZYMON_A"));
assert.ok(Object.keys(SAFARI_MOVE_MASTERS).includes("LAZYMOVE_A"));
assert.equal(species.reads(), 0, "enumerating installed ids must remain lazy");
assert.equal(moves.reads(), 0, "enumerating installed move ids must remain lazy");

assert.equal(SAFARI_SPECIES_MASTERS.LAZYMON_A.id, "LAZYMON_A");
assert.equal(species.reads(), 1, "only the selected species should materialize on read");
assert.equal(SAFARI_MOVE_MASTERS.LAZYMOVE_B.id, "LAZYMOVE_B");
assert.equal(moves.reads(), 1, "only the selected move should materialize on read");

const concreteSpecies = Object.freeze({ id: "LAZYMON_A", base_stats: Object.freeze({ HP: 99 }) });
const concreteMove = Object.freeze({ id: "LAZYMOVE_B", total_pp: 5 });
Object.assign(SAFARI_SPECIES_MASTERS, { LAZYMON_A: concreteSpecies });
Object.assign(SAFARI_MOVE_MASTERS, { LAZYMOVE_B: concreteMove });
assert.equal(SAFARI_SPECIES_MASTERS.LAZYMON_A, concreteSpecies, "selected species Object.assign must concretize the lazy slot");
assert.equal(SAFARI_MOVE_MASTERS.LAZYMOVE_B, concreteMove, "selected move Object.assign must concretize the lazy slot");
assert.equal(species.reads(), 1, "concretized species must no longer read the source projection");
assert.equal(moves.reads(), 1, "concretized move must no longer read the source projection");

assert.equal(SAFARI_MOVE_MASTERS.TACKLE.id, "TACKLE", "exact bootstrap move must remain concrete after GENERAL install");
console.log("Safari GENERAL master install remains lazy and selected-master Object.assign stays compatible: ok");