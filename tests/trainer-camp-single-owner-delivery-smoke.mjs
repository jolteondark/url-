import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [legacy, command, touch, ui, manifest, deferred] = await Promise.all([
  read("trainer-camp-touch-presentation.js"),
  read("runtime/safari-pokemon-center-command.js"),
  read("runtime/safari-trainer-camp-touch.js"),
  read("normal-event-touch-presentation.js"),
  read("board-presentation-manifest.json"),
  read("deferred-ui-loader.js"),
]);

assert.ok(!legacy.includes("addEventListener"), "legacy Trainer Camp presentation must not own clicks");
assert.ok(!legacy.includes("saveSafariPlayableRun"), "legacy Trainer Camp presentation must not own persistence");
assert.match(command, /openSafariTrainerCampTouch/);
assert.match(touch, /safariTrainerCampPresentation/);
assert.match(ui, /resolveSafariTrainerCampInteraction/);
assert.match(ui, /persistSafariOwnerResult\(current, result, window\.localStorage\)/);
assert.match(manifest, /trainer-camp-touch-presentation\.js\?v=20260908-0700/);
assert.match(deferred, /trainer-camp-touch-presentation\.js\?v=20260908-0700/);

console.log("trainer camp single-owner delivery smoke: ok");
