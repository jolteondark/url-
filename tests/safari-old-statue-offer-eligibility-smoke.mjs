import assert from "node:assert/strict";
import fs from "node:fs";

const owner = fs.readFileSync(new URL("../runtime/safari-old-statue-offer-eligibility.js", import.meta.url), "utf8");
const touch = fs.readFileSync(new URL("../old-statue-touch-presentation.js", import.meta.url), "utf8");
const loader = fs.readFileSync(new URL("../lost-bag-touch-presentation.js", import.meta.url), "utf8");

assert.match(owner, /maplessV108ItemMetadata/);
assert.match(owner, /!meta\.keyItem && !meta\.machine && \(meta\.berry \|\| Number\(meta\.price\) > 0\)/);
assert.match(owner, /old_statue_offer_item_ineligible/);
assert.match(owner, /completed:false/);
assert.match(owner, /persistenceRequested:false/);
assert.match(touch, /safari-old-statue-offer-eligibility\.js\?v=20260826-1500/);
assert.match(loader, /old-statue-touch-presentation\.js\?v=20260826-1500/);
console.log("old statue offer eligibility smoke ok");
