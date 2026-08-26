import assert from "node:assert/strict";
import fs from "node:fs";

const owner = fs.readFileSync(new URL("../runtime/safari-old-statue-offer-treasure.js", import.meta.url), "utf8");
const gate = fs.readFileSync(new URL("../runtime/safari-old-statue-offer-eligibility.js", import.meta.url), "utf8");
const touch = fs.readFileSync(new URL("../old-statue-touch-presentation.js", import.meta.url), "utf8");
const loader = fs.readFileSync(new URL("../lost-bag-touch-presentation.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

assert.match(owner, /resolved\.branch === "good" && resolved\.effectIndex === 3/,
  "offer treasure must remain canonical good/effect 3 only");
assert.match(owner, /selectMaplessOldStatueTreasureV108/,
  "offer treasure must reuse the source-owned v0.9.108 selector");
assert.match(owner, /borrowSafariSharedRunRandomInt/,
  "offer treasure must use persisted shared run RNG");
assert.match(owner, /costs:\[\{ item:offeredItem, quantity:1 \}\]/,
  "offered item must be committed in the shared Bag transaction");
assert.match(owner, /items:\[selected\.value\]/,
  "treasure grant must be committed in the same shared Bag transaction");
assert.match(owner, /state\.preview_encounter_counter = counter/,
  "failed treasure selection or Bag commit must roll shared RNG back");
assert.match(owner, /grant_result:true/,
  "canonical Old Statue owner must own the treasure grant result");
assert.doesNotMatch(owner, /Math\.random|new RubyMT19937Random/,
  "Factory must not invent local RNG");
assert.match(gate, /safari-old-statue-offer-treasure\.js\?v=20260826-1600/,
  "canonical offering eligibility must remain the outer gate");
assert.match(touch, /safari-old-statue-offer-eligibility\.js\?v=20260826-1600/);
assert.match(loader, /old-statue-touch-presentation\.js\?v=20260826-1600/);
assert.match(html, /lost-bag-touch-presentation\.js\?v=20260826-1600/);

console.log("Safari Old Statue offer treasure wiring smoke passed");
