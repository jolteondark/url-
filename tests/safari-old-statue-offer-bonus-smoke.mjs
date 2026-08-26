import assert from "node:assert/strict";
import fs from "node:fs";

const owner = fs.readFileSync(new URL("../runtime/safari-old-statue-offer-bonus.js", import.meta.url), "utf8");
const touch = fs.readFileSync(new URL("../old-statue-touch-presentation.js", import.meta.url), "utf8");
const loader = fs.readFileSync(new URL("../lost-bag-touch-presentation.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

assert.match(owner, /resolved\.branch === "good" && resolved\.effectIndex === 1/,
  "offer permanent bonus must remain canonical good/effect 1 only");
assert.match(owner, /selectMaplessOldStatueBonusStatV108/,
  "offer bonus must reuse the canonical Old Statue stat selector");
assert.match(owner, /borrowSafariSharedRunRandomInt/,
  "offer bonus must use persisted shared run RNG");
assert.match(owner, /addPokemonRuntimeMaplessBonusStat/,
  "offer bonus must reuse the Pokemon Runtime permanent bonus owner");
assert.match(owner, /costs:\[\{ item:offeredItem, quantity:1 \}\]/,
  "selected offering must be staged as exactly one Bag cost");
assert.match(owner, /const selected = partyCandidate\(runtime, partyIndex\);[\s\S]*const transaction = resolveRewardTransaction/,
  "pokemon selection must complete before offering transaction commit work");
assert.match(owner, /rollbackSharedDraw\(runtime, counter\)/,
  "failed stat/bonus application must roll shared RNG back");
assert.match(owner, /request_save/,
  "successful permanent bonus must request persistence");
assert.doesNotMatch(owner, /Math\.random|new RubyMT19937Random/,
  "Factory must not invent local RNG or Pokemon mechanics");
assert.match(touch, /safariOldStatueOfferNeedsPokemon/,
  "touch UI must request the target Pokemon before dispatching offer bonus");
assert.match(touch, /safari-old-statue-offer-bonus\.js\?v=20260826-1825/);
assert.match(loader, /old-statue-touch-presentation\.js\?v=20260826-1825/);
assert.match(html, /lost-bag-touch-presentation\.js\?v=20260826-1825/);

console.log("Safari Old Statue offer permanent bonus wiring smoke passed");
