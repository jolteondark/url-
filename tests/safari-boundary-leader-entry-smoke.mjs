import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const command = await readFile(new URL("../runtime/safari-camp-next-day-command.js", import.meta.url), "utf8");
const presentation = await readFile(new URL("../boundary-trial-presentation.js", import.meta.url), "utf8");

assert.match(command, /ensurePendingBoundaryLeaderV108/);
assert.match(command, /selected_leader:\s*selected\.pendingLeader/);
assert.match(command, /resolveBoundaryTrialFlow\(boundaryInput\)/);
assert.match(command, /preparation_required/);
assert.match(presentation, /maplessBoundaryLeaderNameV108/);
assert.match(presentation, /世界に刻まれた強者の残響/);
assert.doesNotMatch(presentation, /MutationObserver/);

console.log("Safari boundary leader entry smoke: ok");
