import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../old-statue-touch-presentation.js", import.meta.url), "utf8");
const manifest = fs.readFileSync(new URL("../board-presentation-manifest.json", import.meta.url), "utf8");
const command = fs.readFileSync(new URL("../runtime/safari-pokemon-center-command.js", import.meta.url), "utf8");

assert.match(command, /event\.normal_event_id === "old_statue"[\s\S]*return openOldStatue\(runtime, index\)/);
assert.doesNotMatch(source, /button\[data-board-index\]/);
assert.doesNotMatch(source, /openStatue\(/);
assert.match(source, /runtime\/safari-owner-result-persistence\.js/);
assert.match(source, /safari-old-statue-break-rewards\.js/);
assert.match(source, /button\[data-normal-event-action\]/);
assert.match(manifest, /old-statue-touch-presentation\.js\?v=20260908-1431/);

console.log("old statue Board single-owner smoke passed");
