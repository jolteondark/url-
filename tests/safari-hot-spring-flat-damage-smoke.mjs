import assert from "node:assert/strict";
import fs from "node:fs";

const owner = fs.readFileSync(new URL("../runtime/safari-hot-spring-interaction.js", import.meta.url), "utf8");
const healing = fs.readFileSync(new URL("../runtime/safari-pokemon-healing.js", import.meta.url), "utf8");
const canonical = fs.readFileSync(new URL("../runtime/mapless-normal-events-a1-flow.js", import.meta.url), "utf8");
const index = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

assert.match(canonical, /enter_burn[\s\S]*damage_pokemon[^\n]*amount:\s*15/,
  "canonical Hot Spring burn branch must remain fixed 15 damage");
assert.match(owner, /damageSafariPokemonFlat\(runtime\.player\.party\[activeIndex\],\s*15\)/,
  "Safari Hot Spring must apply canonical flat 15 damage");
assert.doesNotMatch(owner, /damageSafariPokemonPercent\([^\n]*15\)/,
  "Safari Hot Spring must not reinterpret fixed 15 damage as 15 percent");
assert.match(healing, /export function damageSafariPokemonFlat/,
  "flat overworld damage must live in the shared Safari Pokemon Runtime helper");
assert.match(healing, /Math\.max\(0,[\s\S]*pokemon\.hp[\s\S]*- damage/,
  "flat damage must be able to reach 0 HP");
assert.match(owner, /finishHotSpringPartyWipe/,
  "Hot Spring KO must hand all-fainted resolution to the existing run lifecycle owner");
assert.match(owner, /finishMaplessRun\(runtime\)/,
  "Hot Spring all-fainted branch must reuse the shared finish-run owner");
assert.match(index, /safari-hot-spring-interaction\.js\?v=20260828-1010/,
  "Safari entry must fetch the post-#972 Hot Spring owner");
assert.match(index, /safari-pokemon-healing\.js\?v=20260828-1010/,
  "Safari entry must fetch the post-#972 shared healing owner");
assert.doesNotMatch(index, /safari-hot-spring-interaction\.js\?v=20260827-0755/,
  "pre-#972 Hot Spring cache pin must not return");
assert.doesNotMatch(index, /safari-pokemon-healing\.js\?v=20260827-2259/,
  "pre-#972 healing cache pin must not return");
