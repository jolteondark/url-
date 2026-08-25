import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const sidecar = fs.readFileSync(path.join(root, "runtime", "safari-old-statue-pray-bag-safe.js"), "utf8");
const touch = fs.readFileSync(path.join(root, "old-statue-touch-presentation.js"), "utf8");
const loader = fs.readFileSync(path.join(root, "lost-bag-touch-presentation.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

assert.match(sidecar, /selectMaplessOldStatueTreasureV108/,
  "pray treasure must use the v0.9.108 source-owned shared selection boundary");
assert.match(sidecar, /selectMaplessOldStatueLostLowItemV108/,
  "bad-wind LOW_ITEM loss must use the v0.9.108 source-owned shared selection boundary");
assert.match(sidecar, /MAPLESS_NORMAL_EVENT_SMALL_REWARD_ITEMS\.filter/,
  "owned LOW_ITEM candidates must preserve canonical LOW_ITEMS order before shared sampling");
assert.match(sidecar, /resolveRewardTransaction/,
  "treasure grant and LOW_ITEM removal must use the shared atomic Bag transaction owner");
assert.match(sidecar, /borrowSafariSharedRunRandomInt/,
  "treasure and LOW_ITEM .sample sites must borrow the persisted shared run RNG");
assert.match(sidecar, /rollbackSharedDraw/,
  "failed Bag projection must restore the shared RNG counter so the event remains retryable");
assert.match(sidecar, /owned\.length === 0[\s\S]*?noItem:true/,
  "bad wind with no owned LOW_ITEM must finish without inventing a shared draw");
assert.doesNotMatch(sidecar, /Math\.random|new RubyMT19937Random/,
  "Safari sidecar must not invent an Old Statue RNG or pool");
assert.match(touch, /safari-old-statue-pray-bag-safe\.js\?v=20260826-0545/);
assert.match(loader, /old-statue-touch-presentation\.js\?v=20260826-0545/);
assert.match(html, /lost-bag-touch-presentation\.js\?v=20260826-0545/);

console.log("Old Statue pray treasure / LOW_ITEM Safari hookup smoke passed");
