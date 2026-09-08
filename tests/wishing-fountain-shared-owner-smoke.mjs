import assert from "node:assert/strict";
import fs from "node:fs";

const shared = fs.readFileSync(new URL("../normal-event-touch-presentation.js", import.meta.url), "utf8");
const compat = fs.readFileSync(new URL("../wishing-fountain-touch-presentation.js", import.meta.url), "utf8");
const manifest = fs.readFileSync(new URL("../board-presentation-manifest.json", import.meta.url), "utf8");

assert.match(shared, /wishing_fountain:\s*"\.\/runtime\/safari-wishing-fountain-final-routes\.js\?v=20260908-1630"/);
assert.match(shared, /active\.eventId === "wishing_fountain"[\s\S]*safariWishingFountainPresentation/);
assert.match(shared, /active\.eventId === "wishing_fountain"[\s\S]*resolveSafariWishingFountainInteraction/);
assert.match(shared, /safariWishingFountainBonusCandidates/);
assert.equal((shared.match(/persistSafariOwnerResult\(current, result/g) ?? []).length, 1);

assert.doesNotMatch(compat, /addEventListener\s*\(/);
assert.doesNotMatch(compat, /stopImmediatePropagation/);
assert.doesNotMatch(compat, /persistSafariOwnerResult/);
assert.doesNotMatch(compat, /resolveSafariWishingFountainInteraction/);
assert.match(compat, /safari-wishing-fountain-final-routes\.js\?v=20260908-1630/);
assert.match(manifest, /wishing-fountain-touch-presentation\.js\?v=20260908-1630/);

console.log("wishing fountain shared-owner smoke: ok");
