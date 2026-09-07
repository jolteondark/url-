import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const legacy = await readFile(new URL("../lost-bag-touch-presentation.js", import.meta.url), "utf8");
const command = await readFile(new URL("../runtime/safari-pokemon-center-command.js", import.meta.url), "utf8");
const sharedPresentation = await readFile(new URL("../normal-event-touch-presentation.js", import.meta.url), "utf8");

assert.doesNotMatch(legacy, /addEventListener\(\s*["']click["']/);
assert.doesNotMatch(legacy, /__maplessNormalEventUi/);
assert.doesNotMatch(legacy, /safariLostBagWarning/);
assert.match(command, /event\.normal_event_id === "lost_bag"[^\n]*openSafariLostBagTouch\(runtime, index\)/);
assert.match(sharedPresentation, /active\.eventId === "lost_bag"[^\n]*resolveSafariLostBagInteraction/);

console.log("lost bag single entry owner smoke ok");
