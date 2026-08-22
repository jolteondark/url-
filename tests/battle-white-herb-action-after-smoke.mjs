import assert from "node:assert/strict";
import {
  BATTLE_WHITE_HERB_COVERAGE_CANONICAL,
  resolveWhiteHerbActionAfterCanonical,
} from "../runtime/battle-core-white-herb-extension.js";

const stages = (overrides = {}) => ({
  ATTACK: 0,
  DEFENSE: 0,
  SPECIAL_ATTACK: 0,
  SPECIAL_DEFENSE: 0,
  SPEED: 0,
  ACCURACY: 0,
  EVASION: 0,
  ...overrides,
});

{
  const result = resolveWhiteHerbActionAfterCanonical({
    pokemon: { held_item: "WHITEHERB", item: "WHITEHERB" },
    statStages: stages({ ATTACK: -2, DEFENSE: 3, SPEED: -1 }),
    subject: "user",
  });
  assert.equal(result.triggered, true);
  assert.deepEqual(result.statChanges, [
    { subject: "user", stat: "ATTACK", delta: 2 },
    { subject: "user", stat: "SPEED", delta: 1 },
  ]);
  assert.deepEqual(result.consumeRequest, {
    item: "WHITEHERB",
    permanent: true,
    reason: "white_herb_restore_lowered_stats",
  });
}

{
  const result = resolveWhiteHerbActionAfterCanonical({
    pokemon: { held_item: "WHITEHERB" },
    statStages: stages({ ATTACK: 2, SPEED: 1 }),
    subject: "target",
  });
  assert.equal(result.triggered, false);
  assert.deepEqual(result.statChanges, []);
  assert.equal(result.consumeRequest, null);
}

{
  const result = resolveWhiteHerbActionAfterCanonical({
    pokemon: { held_item: null, item: "WHITEHERB" },
    statStages: stages({ DEFENSE: -1 }),
    subject: "user",
  });
  assert.equal(result.triggered, false);
}

{
  const result = resolveWhiteHerbActionAfterCanonical({
    pokemon: { item: "WHITEHERB" },
    statStages: stages({ SPECIAL_ATTACK: -3 }),
    subject: "target",
  });
  assert.equal(result.triggered, true);
  assert.deepEqual(result.statChanges, [
    { subject: "target", stat: "SPECIAL_ATTACK", delta: 3 },
  ]);
}

assert.deepEqual(BATTLE_WHITE_HERB_COVERAGE_CANONICAL.itemIds, ["WHITEHERB"]);
assert.equal(BATTLE_WHITE_HERB_COVERAGE_CANONICAL.itemCount, 1);
assert.equal(BATTLE_WHITE_HERB_COVERAGE_CANONICAL.classificationCounts.statStageRestorationHeldItems, 1);

console.log("battle White Herb action-after smoke: PASS");
