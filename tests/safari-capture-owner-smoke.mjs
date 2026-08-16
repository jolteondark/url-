import assert from "node:assert/strict";
import {
  activateSafariDayBoardCell,
  attemptSafariCapture,
  createSafariPlayableRuntime,
} from "../runtime/safari-playable-integration.js";

const runtime = createSafariPlayableRuntime();
const state = runtime.variables.mapless;
const wildIndex = state.board_events.findIndex((event) => event.kind === "wild");
assert.notEqual(wildIndex, -1);

const beforeParty = runtime.player.party.length;
const beforeStorage = runtime.storage_system.boxes.reduce(
  (total, box) => total + box.slots.filter(Boolean).length,
  0,
);

const opened = activateSafariDayBoardCell(runtime, wildIndex);
assert.equal(opened.boundary, "wild");
assert.ok(state.battle);

const captured = attemptSafariCapture(runtime);
assert.equal(captured.result, "caught");
assert.equal(captured.ownerResolution.command, "capture");
assert.equal(captured.ownerResolution.capture.result, "caught");
assert.equal(captured.availability.canCapture, true);
assert.equal(state.battle.completed, true);

const afterStorage = runtime.storage_system.boxes.reduce(
  (total, box) => total + box.slots.filter(Boolean).length,
  0,
);
assert.equal(runtime.player.party.length + afterStorage, beforeParty + beforeStorage + 1);
assert.ok(captured.operations.some((operation) => operation.op === "queue_caught_pokemon"));

console.log(JSON.stringify({
  ok: true,
  result: captured.result,
  destination: captured.destination,
  ownerDecision: captured.ownerResolution.decision,
}));
