import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../runtime/safari-burning-wagon-interaction.js", import.meta.url), "utf8");

assert.match(source, /preflightSafariSharedSmallItemReward/,
  "Burning Wagon manual success must preflight through the shared small-reward owner");
assert.match(source, /borrowSafariSharedRunRandomInt/,
  "Burning Wagon manual success must consume the shared run RNG");
assert.match(source, /applySafariSmallItemReward/,
  "Burning Wagon manual success must apply the shared reward transaction result");
assert.match(source, /manualRoll >= 60 && manualRoll < 85/,
  "shared reward must be scoped to the canonical manual success window");
assert.doesNotMatch(source, /action === "manual"[\s\S]{0,220}deterministicItems/,
  "manual success must not use the Safari-local salted deterministic selector");
assert.match(source, /if \(!reward\.success\) state\.preview_encounter_counter = counter/,
  "Bag-full preflight must rollback the shared RNG counter");

console.log("Safari Burning Wagon shared small-reward smoke passed");
