import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../runtime/safari-wishing-fountain-final-routes.js", import.meta.url), "utf8");

assert.match(
  source,
  /\{ op:"request_save", reason:"wishing_fountain_resolved" \}/,
  "resolved Wishing Fountain state must carry the owner save intent through operations",
);
assert.doesNotMatch(
  source,
  /persistenceRequested\s*:\s*true/,
  "Wishing Fountain routes must not keep a second Safari persistence truth",
);

const continuation = source.slice(
  source.indexOf('registerSafariNormalEventBattleContinuation("wishing_fountain"'),
  source.indexOf("export function safariWishingFountainBonusCandidates"),
);
assert.match(continuation, /operations:state\.last_operations/);
assert.doesNotMatch(continuation, /persistenceRequested/);

const largeWish = source.slice(
  source.indexOf('if (action === "large_wish")'),
  source.indexOf('if (action === "reach")'),
);
assert.match(largeWish, /commit\(runtime, index, owner, applied\)/);
assert.doesNotMatch(largeWish, /persistenceRequested/);

const reachStatus = source.slice(source.indexOf('if \(roll >= 70 && roll < 90\)') >= 0 ? source.indexOf('if \(roll >= 70 && roll < 90\)') : source.indexOf('if (roll >= 70 && roll < 90)'));
assert.match(reachStatus, /commit\(runtime, index, owner, appliedStatus\.operations\)/);
assert.doesNotMatch(reachStatus, /persistenceRequested/);

console.log("wishing fountain owner persistence smoke: ok");
