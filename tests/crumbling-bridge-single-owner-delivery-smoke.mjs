import assert from "node:assert/strict";
import fs from "node:fs";

const sidecar = fs.readFileSync(new URL("../crumbling-bridge-touch-presentation.js", import.meta.url), "utf8");
const command = fs.readFileSync(new URL("../runtime/safari-pokemon-center-command.js", import.meta.url), "utf8");
const sharedUi = fs.readFileSync(new URL("../normal-event-touch-presentation.js", import.meta.url), "utf8");
const manifest = fs.readFileSync(new URL("../board-presentation-manifest.json", import.meta.url), "utf8");
const deferred = fs.readFileSync(new URL("../deferred-ui-loader.js", import.meta.url), "utf8");

assert.match(command, /normal_event_id === "crumbling_bridge"[\s\S]*openCrumblingBridge\(runtime, index\)/);
assert.match(sharedUi, /active\.eventId === "crumbling_bridge"[\s\S]*resolveSafariCrumblingBridgeInteraction/);
assert.doesNotMatch(sidecar, /addEventListener|data-board-index|data-normal-event-action|persistSafariOwnerResult|saveSafariPlayableRun/);
assert.match(manifest, /crumbling-bridge-touch-presentation\.js\?v=20260908-1500/);
assert.match(deferred, /crumbling-bridge-touch-presentation\.js\?v=20260908-1500/);
assert.doesNotMatch(deferred, /day-board-direct-persistence-handoff\.js\?v=/);
assert.doesNotMatch(deferred, /board-special-event-ui-handoff\.js\?v=/);

console.log("crumbling bridge single-owner delivery smoke passed");
