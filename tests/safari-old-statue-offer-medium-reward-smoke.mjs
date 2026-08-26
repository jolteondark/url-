import assert from "node:assert/strict";
import fs from "node:fs";

const owner = fs.readFileSync(new URL("../runtime/safari-old-statue-offer-medium-reward.js", import.meta.url), "utf8");
const touch = fs.readFileSync(new URL("../old-statue-touch-presentation.js", import.meta.url), "utf8");
const loader = fs.readFileSync(new URL("../lost-bag-touch-presentation.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

assert.match(owner, /resolved\.branch === "good" && resolved\.effectIndex === 2/,
  "offer medium reward must remain canonical good/effect 2 only");
assert.match(owner, /pickMaplessNormalEventMediumRewards/,
  "offer medium reward must reuse the shared medium reward selector");
assert.match(owner, /borrowSafariSharedRunRandomInt/,
  "offer medium reward must use persisted shared run RNG");
assert.match(owner, /costs:\[\{ item:offeredItem, quantity:1 \}\]/,
  "offering must be part of the same atomic transaction as the reward");
assert.match(owner, /items:selected\.items/,
  "selected reward must be committed by the shared Bag transaction");
assert.match(owner, /state\.preview_encounter_counter = counter/,
  "failed transaction must roll shared RNG back");
assert.match(owner, /request_save/,
  "successful offer must request persistence");
assert.doesNotMatch(owner, /Math\.random|new RubyMT19937Random/,
  "Factory must not invent local RNG");
assert.match(touch, /safari-old-statue-offer-medium-reward\.js\?v=20260826-1400/);
assert.match(loader, /old-statue-touch-presentation\.js\?v=20260826-1400/);
assert.match(html, /lost-bag-touch-presentation\.js\?v=20260826-1400/);

console.log("Safari Old Statue offer medium reward wiring smoke passed");
