import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const command = readFileSync(new URL("../runtime/safari-pokemon-center-command.js", import.meta.url), "utf8");
const presentation = readFileSync(new URL("../normal-event-touch-presentation.js", import.meta.url), "utf8");

assert.match(index, /safari-pokemon-center-command\.js\?v=20260907-1230/, "public import map must refresh the Day Board activation owner");
assert.match(index, /safari-crumbling-bridge-interaction\.js\?v=20260907-1230/, "public import map must version the existing bridge owner adapter");
assert.match(index, /normal-event-touch-presentation\.js\?v=20260907-1230/, "public shell must refresh the shared normal-event presentation router");
assert.match(command, /event\.normal_event_id === "crumbling_bridge"[^\n]+openCrumblingBridge\(runtime, index\)/, "Day Board activation must enter the existing bridge adapter");
assert.match(command, /new CustomEvent\("safari-normal-event-ui"\)/, "bridge activation must wake the shared normal-event modal");
assert.match(presentation, /crumbling_bridge:"\.\/runtime\/safari-crumbling-bridge-interaction\.js"/, "shared modal must load the bridge owner adapter");
assert.match(presentation, /active\.eventId === "crumbling_bridge"[^\n]+resolveSafariCrumblingBridgeInteraction/, "bridge choices must return to the existing bridge owner");

console.log("crumbling bridge public playable delivery smoke: ok");
