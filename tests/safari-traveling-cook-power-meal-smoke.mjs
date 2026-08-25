import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const wrapper = fs.readFileSync(path.join(root, "runtime", "safari-traveling-cook-interaction.js"), "utf8");
const base = fs.readFileSync(path.join(root, "runtime", "safari-traveling-cook-interaction-base.js"), "utf8");

assert.match(wrapper, /setSafariPowerMeal/,
  "Traveling Cook power routes must use the shared Core power-meal owner");
assert.match(wrapper, /resolveTravelingCook/,
  "Factory wrapper must retain the canonical Traveling Cook resolver as event truth");
assert.match(wrapper, /prototypePower[\s\S]*?prototype_roll[\s\S]*?>= 65[\s\S]*?< 85/,
  "prototype power route must match the canonical 65..<85 band");
assert.match(wrapper, /commitPowerMeal\(runtime, index, owner, 1\)/,
  "prototype power meal must last one battle");
assert.match(wrapper, /commitPowerMeal\(runtime, index, owner, 3/,
  "selected power meal must last three battles");
assert.match(wrapper, /"1":"berries", "2":"pay", "3":"prototype"/,
  "Safari UI must expose berries, pay, and prototype routes");
assert.match(wrapper, /"1":"heal", "2":"medicine", "3":"power"/,
  "Safari meal UI must expose heal, medicine, and power choices");
assert.match(wrapper, /resolveRewardTransaction/,
  "berry payment must remain on the existing atomic Bag transaction owner");
assert.match(base, /power_meal_owner_missing/,
  "the preserved pre-Core adapter should remain byte-equivalent evidence of the removed blocker");
assert.doesNotMatch(wrapper, /RubyMT19937Random|Math\.random|crypto\.getRandomValues/,
  "Factory power-meal wiring must not invent RNG");

console.log("Safari Traveling Cook full-choice / power-meal wiring smoke passed");
