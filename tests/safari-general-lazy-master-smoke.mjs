import assert from "node:assert/strict";
import {
  SAFARI_GENERAL_MOVE_MASTERS,
  SAFARI_GENERAL_SPECIES_MASTERS,
  safariCanonicalResetMoves,
  safariGeneralMaterializedMasterCounts,
} from "../runtime/safari-general-encounter-data-loader.js";

assert.deepEqual(safariGeneralMaterializedMasterCounts(), { species: 0, moves: 0 });
assert.equal(Object.prototype.hasOwnProperty.call(SAFARI_GENERAL_SPECIES_MASTERS, "PIKACHU"), true);
assert.deepEqual(safariGeneralMaterializedMasterCounts(), { species: 0, moves: 0 }, "existence checks must not materialize masters");

const pikachu = SAFARI_GENERAL_SPECIES_MASTERS.PIKACHU;
assert.equal(pikachu.id, "PIKACHU");
assert.deepEqual(safariGeneralMaterializedMasterCounts(), { species: 1, moves: 0 });

const moves = safariCanonicalResetMoves("PIKACHU", 10);
assert.ok(moves.length >= 1 && moves.length <= 4);
for (const id of moves) assert.ok(SAFARI_GENERAL_MOVE_MASTERS[id]);
const counts = safariGeneralMaterializedMasterCounts();
assert.equal(counts.species, 1);
assert.equal(counts.moves, new Set(moves).size);
assert.ok(counts.moves < 608);

console.log("Safari GENERAL lazy master projection: ok");
