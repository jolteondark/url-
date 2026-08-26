import assert from "node:assert/strict";
import fs from "node:fs";

const owner = fs.readFileSync(new URL("../runtime/safari-mushroom-field-interaction.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

assert.match(owner, /addPokemonRuntimeMaplessBonusStat/,
  "Mushroom Field permanent bonus must use the shared Pokemon Runtime owner");
assert.match(owner, /SAFARI_SPECIES_MASTERS/,
  "shared bonus application must use the existing species master boundary");
assert.match(owner, /SAFARI_NATURE_MASTERS/,
  "shared bonus application must use the existing nature master boundary");
assert.doesNotMatch(owner, /function applyMaplessBonus\s*\(/,
  "the old Safari-local permanent bonus mechanics clone must be removed");
assert.doesNotMatch(owner, /bonuses\[key\]\s*=/,
  "Mushroom Field must not mutate mapless bonus stats locally");
assert.match(owner, /operation\.op === "add_bonus"[\s\S]*applyPermanentBonus/,
  "canonical add_bonus operations must delegate to the shared owner adapter");
assert.match(html, /"\.\/runtime\/safari-mushroom-field-interaction\.js":\s*"\.\/runtime\/safari-mushroom-field-interaction\.js\?v=20260827-0540"/,
  "Safari import map must fetch the post-#909 Mushroom Field owner generation");
