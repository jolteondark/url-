import assert from "node:assert/strict";
import { activateSafariDayBoardCell } from "../runtime/safari-pokemon-center-command.js";
import { resolveSafariCrumblingBridgeInteraction } from "../runtime/safari-crumbling-bridge-interaction.js";

const originalDocument = globalThis.document;
const originalCustomEvent = globalThis.CustomEvent;
const originalDispatchEvent = globalThis.dispatchEvent;
const originalUi = globalThis.__maplessNormalEventUi;

const dispatched = [];
globalThis.document = {};
globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};
globalThis.dispatchEvent = (event) => { dispatched.push(event.type); return true; };

try {
  const event = {
    kind:"normal_event",
    normal_event_id:"crumbling_bridge",
    normal_seed:12345,
    normal_resolved:false,
    normal_data:{ careful_roll:10, reward_kind:"rescue" },
  };
  const runtime = {
    variables:{ mapless:{
      day:4,
      location:"day_board",
      board_events:[event],
      board_consumed:[false],
      board_revealed:[false],
      board_visited:[false],
      last_operations:[],
    } },
    player:{ party:[] },
    bag:{ slots:[], money:500 },
    log:[],
  };

  const opened = activateSafariDayBoardCell(runtime, 0);
  assert.equal(opened.result, "crumbling_bridge_ready");
  assert.equal(opened.boundary, "normal_event");
  assert.equal(runtime.variables.mapless.board_revealed[0], true);
  assert.equal(runtime.variables.mapless.board_visited[0], true);
  assert.equal(globalThis.__maplessNormalEventUi?.eventId, "crumbling_bridge");
  assert.deepEqual(globalThis.__maplessNormalEventUi?.actions.map((action) => action.id), ["careful", "leave"]);
  assert.ok(dispatched.includes("safari-normal-event-ui"), "Day Board activation must wake the shared normal-event modal");

  const resolved = resolveSafariCrumblingBridgeInteraction(runtime, 0, "leave");
  assert.equal(resolved.completed, true);
  assert.equal(resolved.result, "left");
  assert.equal(runtime.variables.mapless.board_consumed[0], true);
  assert.equal(runtime.variables.mapless.board_events[0].normal_resolved, true);
  assert.equal(resolved.persistenceRequested, true);
  assert.ok(resolved.operations.some((operation) => operation.op === "finish_event"));
  assert.ok(resolved.operations.some((operation) => operation.op === "request_save" && operation.reason === "crumbling_bridge"));
} finally {
  if (originalDocument === undefined) delete globalThis.document; else globalThis.document = originalDocument;
  if (originalCustomEvent === undefined) delete globalThis.CustomEvent; else globalThis.CustomEvent = originalCustomEvent;
  if (originalDispatchEvent === undefined) delete globalThis.dispatchEvent; else globalThis.dispatchEvent = originalDispatchEvent;
  if (originalUi === undefined) delete globalThis.__maplessNormalEventUi; else globalThis.__maplessNormalEventUi = originalUi;
}

console.log("safari crumbling bridge playable smoke: ok");
