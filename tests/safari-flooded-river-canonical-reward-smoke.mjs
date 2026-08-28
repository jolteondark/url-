import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../runtime/safari-flooded-river-interaction.js", import.meta.url), "utf8");

assert.match(source, /resolveMaplessV108FloodedRiverReward/,
  "Flooded River water/ice rewards must delegate to the canonical v0.9.108 owner");
assert.match(source, /resolveMaplessV108FloodedRiverReward\(event\.normal_seed, action\)/,
  "Flooded River rewards must use the event-local normal_seed boundary");
assert.doesNotMatch(source, /0x51f15e|0x1ce1ce/,
  "Flooded River must not keep Safari-local XOR reward salts");
assert.doesNotMatch(source, /const seedSalt = action === "water"/,
  "Flooded River must not keep a second reward RNG truth");
assert.match(source, /Object\.fromEntries\(items\.map\(\(itemId\) => \[itemId, \{ valid: true, pocket: "general" \}\]\)\)/,
  "Bag preflight must accept the canonical reward pool rather than the legacy LOW_ITEMS-only metadata");
assert.match(source, /function canonicalForceInput/,
  "force-route item loss remains separate and unchanged by this reward-owner wiring");
assert.match(source, /damageSafariPokemonPercent/,
  "Flooded River force damage must delegate Pokemon damage mechanics to the shared Safari owner");
assert.match(source, /return damageSafariPokemonPercent\(pokemon, percent\)/,
  "Flooded River must apply canonical percent damage through the shared runtime owner");
assert.doesNotMatch(source, /updatePokemonRuntime/,
  "Flooded River adapter must not directly rebuild Pokemon runtime state for force damage");
assert.doesNotMatch(source, /Math\.ceil\(maxHp \* Math\.trunc\(Number\(percent\)\)/,
  "Flooded River adapter must not duplicate percent-damage arithmetic");

console.log("Safari Flooded River canonical reward smoke passed");
