import assert from "node:assert/strict";
import { projectCanonicalTeacherMovesV108 } from "../runtime/mapless-teacher-move-projection-v108.js";
import { activateSafariDayBoardCell } from "../runtime/safari-pokemon-center-command.js";
import { continueSafariFreeTeacherTouch } from "../runtime/safari-free-teacher-touch.js";

const species = ["PIKACHU", "BULBASAUR", "CHARMANDER", "SQUIRTLE", "EEVEE"]
  .find((id) => projectCanonicalTeacherMovesV108({ species:id, form:0 }, "egg").length > 0);
assert.ok(species, "fixture species with a canonical egg move is required");

function runtimeWith(moves = []) {
  return {
    player:{ party:[{ species, form:0, level:20, personal_id:7, moves:[...moves] }] },
    variables:{ mapless:{
      board_events:[{ kind:"normal_event", normal_event_id:"bloodline_grandmother", normal_seed:8, normal_data:{ teacher_seed:10 } }],
      board_revealed:[false], board_visited:[false], board_consumed:[false], last_operations:[],
    } },
  };
}

globalThis.document = {};
const runtime = runtimeWith([]);
const opened = activateSafariDayBoardCell(runtime, 0);
assert.equal(opened.result, "free_teacher_ready");
assert.equal(opened.persistenceRequested, false);
assert.equal(runtime.variables.mapless.board_consumed[0], false);
assert.equal(globalThis.__maplessNormalEventUi?.selection?.kind, "free_teacher_pokemon");

const committed = continueSafariFreeTeacherTouch(runtime, 0, { pokemonIndex:0 });
assert.equal(committed.completed, true);
assert.equal(committed.persistenceRequested, true);
assert.equal(runtime.variables.mapless.board_consumed[0], true);
assert.equal(runtime.variables.mapless.last_operations.filter((op) => op.op === "request_save").length, 1);
assert.equal(globalThis.__maplessNormalEventUi, null);

delete globalThis.document;
delete globalThis.__maplessNormalEventUi;
console.log("safari free teacher touch smoke: ok");
