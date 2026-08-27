import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../runtime/safari-pokemon-healing.js", import.meta.url), "utf8");

assert.match(source, /resolveMaplessV108PartyPercentHeal/,
  "Safari percent heal must delegate HP arithmetic to the frozen v0.9.108 owner");
assert.match(source, /pct \/ 100/,
  "Safari percent input must be projected to the canonical fraction boundary");
assert.doesNotMatch(source, /Math\.ceil\(\(maxHp \* pct\) \/ 100\)/,
  "Safari percent heal must not retain the pre-v0.9.108 ceil arithmetic");
assert.match(source, /setHp:\(pokemon, hp, index\)[\s\S]*updatePokemonRuntime\(pokemon, \{ hp \}\)/,
  "Pokemon Runtime must remain the HP mutation owner");
assert.match(source, /if \(cureStatus\)/,
  "existing optional status-cure behavior must remain caller-side and separate from canonical HP arithmetic");

console.log("Safari percent heal v0.9.108 owner smoke: ok");
