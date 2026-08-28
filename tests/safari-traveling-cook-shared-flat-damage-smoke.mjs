import assert from "node:assert/strict";
import fs from "node:fs";

const base = fs.readFileSync(new URL("../runtime/safari-traveling-cook-interaction-base.js", import.meta.url), "utf8");
const healing = fs.readFileSync(new URL("../runtime/safari-pokemon-healing.js", import.meta.url), "utf8");
const presentation = fs.readFileSync(new URL("../normal-event-touch-presentation.js", import.meta.url), "utf8");
const index = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

assert.match(base, /damageSafariPokemonFlat/,
  "Traveling Cook must import the shared Safari flat-damage owner");
assert.match(base, /return damageSafariPokemonFlat\(pokemon, amount\);/,
  "prototype party damage must delegate each usable Pokemon to the shared flat-damage owner");
assert.match(base, /prototype_damage"\) applied\.push\(\.\.\.applyFlatPartyDamage\(runtime, 10\)\)/,
  "Traveling Cook prototype damage must remain fixed at 10 HP");
assert.doesNotMatch(base, /const hp = Math\.max\(0, Math\.trunc\(Number\(pokemon\.hp/,
  "Traveling Cook adapter must not duplicate flat HP arithmetic");
assert.match(healing, /export function damageSafariPokemonFlat/,
  "shared flat-damage owner must remain available");
assert.match(presentation, /safari-traveling-cook-interaction\.js\?v=20260828-1605/,
  "normal-event touch presentation must fetch the post-change Traveling Cook owner");
assert.doesNotMatch(presentation, /safari-traveling-cook-interaction\.js\?v=20260825-2200/,
  "pre-change Traveling Cook owner pin must not return");
assert.match(index, /normal-event-touch-presentation\.js\?v=20260828-1605/,
  "Safari entry must fetch the refreshed normal-event touch presentation");

console.log("Safari Traveling Cook shared flat-damage smoke passed");
