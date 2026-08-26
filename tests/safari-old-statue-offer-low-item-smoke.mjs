import assert from "node:assert/strict";
import fs from "node:fs";

const owner = fs.readFileSync(new URL("../runtime/safari-old-statue-offer-low-item.js", import.meta.url), "utf8");
const touch = fs.readFileSync(new URL("../old-statue-touch-presentation.js", import.meta.url), "utf8");
const loader = fs.readFileSync(new URL("../lost-bag-touch-presentation.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

assert.match(owner, /resolved\.branch === "bad" && resolved\.effectIndex === 2/,
  "offer LOW_ITEM loss must remain canonical bad/effect 2 only");
assert.match(owner, /MAPLESS_NORMAL_EVENT_SMALL_REWARD_ITEMS/,
  "offer LOW_ITEM loss must reuse the canonical LOW_ITEM pool used by pray");
assert.match(owner, /selectMaplessOldStatueLostLowItemV108/,
  "offer LOW_ITEM loss must reuse the canonical Old Statue selector");
assert.match(owner, /borrowSafariSharedRunRandomInt/,
  "offer LOW_ITEM selection must use persisted shared run RNG");
assert.match(owner, /quantity\(runtime, itemId\) - plannedOfferingCost > 0/,
  "LOW_ITEM eligibility must be evaluated after the planned offering cost");
assert.match(owner, /combinedCosts\(offeredItem, selectedLowItem\)/,
  "offering and LOW_ITEM loss must share one atomic Bag transaction");
assert.match(owner, /if \(String\(selectedLowItem\) === String\(offeredItem\)\) return \[\{ item:offeredItem, quantity:2 \}\]/,
  "same-item offering and loss must commit as an exact quantity-two cost");
assert.match(owner, /rollbackSharedDraw\(runtime, counter\)/,
  "failed commit must roll shared RNG back");
assert.match(owner, /low_item:selectedLowItem/,
  "canonical resolver must receive the selected lost LOW_ITEM");
assert.match(owner, /request_save/,
  "successful offer loss must request persistence");
assert.doesNotMatch(owner, /Math\.random|new RubyMT19937Random/,
  "Factory must not invent local RNG");
assert.match(touch, /safari-old-statue-offer-low-item\.js\?v=20260826-1810/);
assert.match(loader, /old-statue-touch-presentation\.js\?v=20260826-1810/);
assert.match(html, /lost-bag-touch-presentation\.js\?v=20260826-1810/);

console.log("Safari Old Statue offer LOW_ITEM wiring smoke passed");
