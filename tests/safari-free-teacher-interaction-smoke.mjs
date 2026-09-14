import assert from "node:assert/strict";
import { projectCanonicalTeacherMovesV108 } from "../runtime/mapless-teacher-move-projection-v108.js";
import {
  resolveSafariFreeTeacherInteraction,
  safariFreeTeacherCandidates,
} from "../runtime/safari-free-teacher-interaction.js";

const species = ["PIKACHU", "BULBASAUR", "CHARMANDER", "SQUIRTLE", "EEVEE"]
  .find((id) => projectCanonicalTeacherMovesV108({ species:id, form:0 }, "egg").length > 0);
assert.ok(species, "fixture species with a canonical egg move is required");

function runtimeWith(moves = []) {
  return {
    player:{ party:[{ species, form:0, level:20, personal_id:7, moves:[...moves] }] },
    variables:{ mapless:{
      board_events:[{
        kind:"normal_event",
        normal_event_id:"bloodline_grandmother",
        normal_seed:8,
        normal_data:{ teacher_seed:10 },
      }],
      board_revealed:[false],
      board_visited:[false],
      board_consumed:[false],
      last_operations:[],
    } },
  };
}

const selectionRuntime = runtimeWith([]);
const candidates = safariFreeTeacherCandidates(selectionRuntime, 0);
assert.equal(candidates.length, 1);
assert.equal(candidates[0].index, 0);
const selection = resolveSafariFreeTeacherInteraction(selectionRuntime, 0, {});
assert.equal(selection.result, "pokemon_selection_required");
assert.equal(selection.persistenceRequested, false);
assert.equal(selectionRuntime.variables.mapless.board_consumed[0], false);

const learnedRuntime = runtimeWith([]);
const learned = resolveSafariFreeTeacherInteraction(learnedRuntime, 0, { pokemonIndex:0 });
assert.equal(learned.success, undefined);
assert.equal(learned.completed, true);
assert.equal(learned.persistenceRequested, true);
assert.equal(learnedRuntime.variables.mapless.board_consumed[0], true);
assert.equal(learnedRuntime.variables.mapless.board_events[0].normal_resolved, true);
assert.equal(learnedRuntime.player.party[0].moves.length, 1);
assert.equal(learnedRuntime.variables.mapless.last_operations.filter((op) => op.op === "request_save").length, 1);

const fullRuntime = runtimeWith(["TACKLE", "GROWL", "TAILWHIP", "QUICKATTACK"]);
const before = structuredClone(fullRuntime.player.party[0]);
const needsReplacement = resolveSafariFreeTeacherInteraction(fullRuntime, 0, { pokemonIndex:0 });
assert.equal(needsReplacement.result, "move_replacement_required");
assert.equal(needsReplacement.persistenceRequested, false);
assert.deepEqual(fullRuntime.player.party[0], before);
assert.equal(fullRuntime.variables.mapless.board_consumed[0], false);
assert.ok(needsReplacement.selection.entries.length === 4);

const replaced = resolveSafariFreeTeacherInteraction(fullRuntime, 0, {
  pokemonIndex:0,
  replacementIndex:needsReplacement.selection.entries[1].index,
});
assert.equal(replaced.completed, true);
assert.equal(replaced.persistenceRequested, true);
assert.equal(fullRuntime.variables.mapless.board_consumed[0], true);
assert.equal(fullRuntime.variables.mapless.last_operations.filter((op) => op.op === "request_save").length, 1);

const cancelledRuntime = runtimeWith(["TACKLE", "GROWL", "TAILWHIP", "QUICKATTACK"]);
const cancelledBefore = structuredClone(cancelledRuntime.player.party[0]);
const cancelled = resolveSafariFreeTeacherInteraction(cancelledRuntime, 0, { pokemonIndex:0, replacementCancelled:true });
assert.equal(cancelled.result, "move_learn_cancelled");
assert.equal(cancelled.persistenceRequested, false);
assert.deepEqual(cancelledRuntime.player.party[0], cancelledBefore);
assert.equal(cancelledRuntime.variables.mapless.board_consumed[0], false);
assert.equal(cancelledRuntime.variables.mapless.last_operations.filter((op) => op.op === "request_save").length, 0);

console.log("safari free teacher interaction smoke: ok");
