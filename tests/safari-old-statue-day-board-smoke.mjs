import assert from "node:assert/strict";
import { activateSafariDayBoardCell } from "../runtime/safari-pokemon-center-command.js";
import { resolveSafariOldStatueInteraction } from "../runtime/safari-old-statue-interaction.js";

const previousDocument = globalThis.document;
const previousUi = globalThis.__maplessNormalEventUi;
globalThis.document = {};

try {
  const runtime = {
    variables:{ mapless:{
      day:3,
      location:"day_board",
      board_events:[{
        kind:"normal_event",
        normal_event_id:"old_statue",
        normal_seed:12345,
        normal_data:{ pray_roll:60 },
        normal_resolved:false,
      }],
      board_revealed:[false],
      board_visited:[false],
      board_consumed:[false],
      last_operations:[],
    } },
    player:{ party:[] },
    bag:{ slots:[], money:0 },
  };

  const opened = activateSafariDayBoardCell(runtime, 0);
  assert.equal(opened.result, "old_statue_ready");
  assert.equal(opened.boundary, "normal_event");
  assert.equal(runtime.variables.mapless.board_revealed[0], true);
  assert.equal(runtime.variables.mapless.board_visited[0], true);
  assert.equal(globalThis.__maplessNormalEventUi?.eventId, "old_statue");
  assert.ok(globalThis.__maplessNormalEventUi?.actions?.some((action) => action.id === "pray"));
  assert.ok(globalThis.__maplessNormalEventUi?.actions?.some((action) => action.id === "leave"));

  const resolved = resolveSafariOldStatueInteraction(runtime, 0, "leave");
  assert.equal(resolved.completed, true);
  assert.equal(resolved.persistenceRequested, true);
  assert.equal(runtime.variables.mapless.board_consumed[0], true);
  assert.equal(runtime.variables.mapless.board_events[0].normal_resolved, true);
  assert.ok(runtime.variables.mapless.last_operations.some((operation) => operation.op === "finish_event"));
  assert.ok(runtime.variables.mapless.last_operations.some((operation) => operation.op === "request_save"));
} finally {
  if (previousDocument === undefined) delete globalThis.document;
  else globalThis.document = previousDocument;
  if (previousUi === undefined) delete globalThis.__maplessNormalEventUi;
  else globalThis.__maplessNormalEventUi = previousUi;
}

console.log("safari old statue Day Board smoke passed");
