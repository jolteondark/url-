import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const sidecar = fs.readFileSync(path.join(root, "runtime", "safari-old-statue-pray-bonus.js"), "utf8");
const touch = fs.readFileSync(path.join(root, "old-statue-touch-presentation.js"), "utf8");
const loader = fs.readFileSync(path.join(root, "lost-bag-touch-presentation.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

assert.match(sidecar, /selectMaplessOldStatueBonusStatV108/,
  "Old Statue bonus stat must use the source-owned v0.9.108 selector");
assert.match(sidecar, /borrowSafariSharedRunRandomInt/,
  "bonus stat sample must borrow the persisted shared run RNG");
assert.match(sidecar, /addPokemonRuntimeMaplessBonusStat/,
  "permanent bonus must reuse the shared Pokemon Runtime owner");
assert.match(sidecar, /pokemon && !isEgg\(pokemon\)/,
  "bonus candidates must exclude eggs while allowing fainted Pokemon");
assert.match(sidecar, /old_statue_bonus_selection_cancelled/,
  "cancelled Pokemon choice must leave the event retryable");
assert.doesNotMatch(sidecar, /Math\.random|new RubyMT19937Random/,
  "Safari bonus sidecar must not invent local RNG");
assert.match(touch, /safariOldStatueBonusCandidates/,
  "touch UI must present canonical eligible Pokemon candidates");
assert.match(touch, /safariOldStatuePrayNeedsPokemon/,
  "touch UI must ask for a Pokemon only for the permanent-bonus outcome");
assert.match(touch, /safari-old-statue-pray-bonus\.js\?v=20260826-0645/);
assert.match(loader, /old-statue-touch-presentation\.js\?v=20260826-0645/);
assert.match(html, /lost-bag-touch-presentation\.js\?v=20260826-0645/);

console.log("Old Statue pray permanent-bonus Safari hookup smoke passed");
