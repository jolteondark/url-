import fs from "node:fs";
import assert from "node:assert/strict";

const presentation = fs.readFileSync(new URL("../traveling-cook-power-presentation.js", import.meta.url), "utf8");
const shared = fs.readFileSync(new URL("../normal-event-touch-presentation.js", import.meta.url), "utf8");

assert.match(presentation, /data\.normalEventAction = action/);
assert.match(presentation, /"pay:power"/);
assert.match(presentation, /"berries:power"/);
assert.doesNotMatch(presentation, /addEventListener\("click"/);
assert.doesNotMatch(presentation, /stopImmediatePropagation/);
assert.doesNotMatch(presentation, /saveSafariPlayableRun/);
assert.doesNotMatch(presentation, /persistenceRequested/);
assert.doesNotMatch(presentation, /600\s*\+/);
assert.doesNotMatch(presentation, /BERRY\$/);
assert.doesNotMatch(presentation, /resolveSafariTravelingCookInteraction/);

assert.match(shared, /persistSafariOwnerResult\(current, result, window\.localStorage\)/);
assert.match(shared, /startsWith\("berries:"\)/);
assert.match(shared, /startsWith\("pay:"\)/);
assert.match(shared, /resolveSafariTravelingCookInteraction\(current, active\.boardIndex, "berries"/);
assert.match(shared, /resolveSafariTravelingCookInteraction\(current, active\.boardIndex, "pay"/);

console.log("traveling cook single-owner smoke: ok");
