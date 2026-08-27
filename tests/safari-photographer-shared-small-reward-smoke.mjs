import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../runtime/safari-photographer-interaction.js", import.meta.url), "utf8");
const canonical = fs.readFileSync(new URL("../runtime/mapless-normal-events-a3-flow.js", import.meta.url), "utf8");

assert.match(canonical, /grant_random',tier:'small',quantity:1/);
assert.match(source, /preflightSafariSharedSmallItemReward/);
assert.match(source, /borrowSafariSharedRunRandomInt/);
assert.match(source, /applySafariSmallItemReward/);
assert.match(source, /canAcceptSharedSmallReward/);
assert.doesNotMatch(source, /RubyMT19937Random/);
assert.doesNotMatch(source, /const LOW_ITEMS/);
assert.doesNotMatch(source, /0x70686f74/);

const continuationStart = source.indexOf('registerSafariNormalEventBattleContinuation("photographer"');
const sharedDraw = source.indexOf("sharedSmallReward(runtime)", continuationStart);
assert.ok(continuationStart >= 0 && sharedDraw > continuationStart, "shared reward must be drawn in the post-Battle continuation");

console.log("Safari Photographer shared-small-reward boundary smoke: ok");
