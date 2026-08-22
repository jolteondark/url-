import assert from "node:assert/strict";
import {
  BATTLE_HIT_STAT_REACTION_COVERAGE_CANONICAL,
  resolveHitStatReactionCanonical,
} from "../runtime/battle-core-hit-stat-reaction-extension.js";

function target(ability, extra = {}) {
  return { ability, ...extra };
}

function resolve(ability, { type = "NORMAL", category = "Physical", hit = true, extra = {} } = {}) {
  return resolveHitStatReactionCanonical({
    target: target(ability, extra),
    move: { id: "TESTMOVE", type, category },
    hit,
  });
}

assert.deepEqual(resolve("WATERCOMPACTION", { type: "WATER", category: "Special" }).statChanges, [
  { subject: "target", stat: "DEFENSE", delta: 2 },
]);
assert.equal(resolve("WATERCOMPACTION", { type: "FIRE" }).triggered, false);

assert.deepEqual(resolve("STEAMENGINE", { type: "WATER", category: "Special" }).statChanges, [
  { subject: "target", stat: "SPEED", delta: 6 },
]);
assert.deepEqual(resolve("STEAMENGINE", { type: "FIRE", category: "Special" }).statChanges, [
  { subject: "target", stat: "SPEED", delta: 6 },
]);
assert.equal(resolve("STEAMENGINE", { type: "ELECTRIC" }).triggered, false);

for (const type of ["BUG", "DARK", "GHOST"]) {
  assert.deepEqual(resolve("RATTLED", { type }).statChanges, [
    { subject: "target", stat: "SPEED", delta: 1 },
  ]);
}
assert.equal(resolve("RATTLED", { type: "NORMAL" }).triggered, false);

for (const ability of ["WATERCOMPACTION", "STEAMENGINE", "RATTLED"]) {
  assert.equal(resolve(ability, { type: ability === "WATERCOMPACTION" ? "WATER" : ability === "STEAMENGINE" ? "FIRE" : "DARK", hit: false }).triggered, false);
}

assert.equal(resolveHitStatReactionCanonical({
  target: { ability: null, ability_id: "RATTLED" },
  move: { type: "DARK", category: "Physical" },
  hit: true,
}).triggered, false, "canonical ability=null must suppress a stale legacy alias");

assert.equal(resolveHitStatReactionCanonical({
  target: { ability_id: "RATTLED" },
  move: { type: "DARK", category: "Physical" },
  hit: true,
}).triggered, true, "legacy-only Pokemon objects remain supported");

assert.deepEqual(BATTLE_HIT_STAT_REACTION_COVERAGE_CANONICAL.abilityIds, [
  "JUSTIFIED",
  "RATTLED",
  "STAMINA",
  "STEAMENGINE",
  "WATERCOMPACTION",
  "WEAKARMOR",
]);
assert.equal(BATTLE_HIT_STAT_REACTION_COVERAGE_CANONICAL.abilityCount, 6);
assert.equal(BATTLE_HIT_STAT_REACTION_COVERAGE_CANONICAL.classificationCounts.physicalHitStatReactionAbilities, 1);
assert.equal(BATTLE_HIT_STAT_REACTION_COVERAGE_CANONICAL.classificationCounts.anyHitStatReactionAbilities, 1);
assert.equal(BATTLE_HIT_STAT_REACTION_COVERAGE_CANONICAL.classificationCounts.typeHitStatReactionAbilities, 4);
assert.equal(BATTLE_HIT_STAT_REACTION_COVERAGE_CANONICAL.classificationCounts.waterHitStatReactionAbilities, 2);
assert.equal(BATTLE_HIT_STAT_REACTION_COVERAGE_CANONICAL.classificationCounts.fireOrWaterHitStatReactionAbilities, 1);
assert.equal(BATTLE_HIT_STAT_REACTION_COVERAGE_CANONICAL.classificationCounts.bugDarkGhostHitStatReactionAbilities, 1);

console.log("battle hit-stat reaction extension smoke: PASS");
