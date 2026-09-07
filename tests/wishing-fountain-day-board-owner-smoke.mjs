import assert from "node:assert/strict";
import fs from "node:fs";

const command = fs.readFileSync(new URL("../runtime/safari-pokemon-center-command.js", import.meta.url), "utf8");
const touch = fs.readFileSync(new URL("../runtime/safari-wishing-fountain-touch.js", import.meta.url), "utf8");
const presentation = fs.readFileSync(new URL("../wishing-fountain-touch-presentation.js", import.meta.url), "utf8");

assert.match(command, /openSafariWishingFountainTouch/);
assert.match(command, /normal_event_id === "wishing_fountain"/);
assert.match(touch, /safariWishingFountainPresentation/);
assert.match(touch, /__maplessNormalEventUi/);
assert.doesNotMatch(presentation, /button\[data-board-index\]/);
assert.doesNotMatch(presentation, /openFountain\(/);
assert.match(presentation, /resolveSafariWishingFountainInteraction/);
assert.match(presentation, /persistSafariOwnerResult/);

console.log("wishing fountain Day Board owner smoke passed");
