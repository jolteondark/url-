import assert from "node:assert/strict";
import {
  BATTLE_HIT_STAT_REACTION_COVERAGE_CANONICAL,
  resolveHitStatReactionCanonical,
} from "../runtime/battle-core-hit-stat-reaction-extension.js";
import {
  resolveBattleAbilityItemHookCanonical,
} from "../runtime/battle-ability-item-hook-dispatch.js";

const pokemon = (ability, extra = {}) => ({
  ability,
  held_item: null,
  hp: 100,
  max_hp: 100,
  ...extra,
});

{
  const result = resolveHitStatReactionCanonical({
    target: pokemon("WEAKARMOR"),
    move: { id: "TACKLE", type: "NORMAL", category: "Physical" },
    hit: true,
  });
  assert.equal(result.triggered, true);
  assert.deepEqual(result.statChanges, [
    { subject: "target", stat: "DEFENSE", delta: -1 },
    { subject: "target", stat: "SPEED", delta: 2 },
  ]);
}

assert.equal(resolveHitStatReactionCanonical({
  target: pokemon("WEAKARMOR"),
  move: { id: "WATERGUN", type: "WATER", category: "Special" },
  hit: true,
}).triggered, false);

{
  const result = resolveHitStatReactionCanonical({
    target: pokemon("STAMINA"),
    move: { id: "WATERGUN", type: "WATER", category: "Special" },
    hit: true,
  });
  assert.deepEqual(result.statChanges, [
    { subject: "target", stat: "DEFENSE", delta: 1 },
  ]);
}

{
  const result = resolveHitStatReactionCanonical({
    target: pokemon("JUSTIFIED"),
    move: { id: "BITE", type: "DARK", category: "Physical" },
    hit: true,
  });
  assert.deepEqual(result.statChanges, [
    { subject: "target", stat: "ATTACK", delta: 1 },
  ]);
}

assert.equal(resolveHitStatReactionCanonical({
  target: pokemon("JUSTIFIED"),
  move: { id: "TACKLE", type: "NORMAL", category: "Physical" },
  hit: true,
}).triggered, false);

assert.equal(resolveHitStatReactionCanonical({
  target: pokemon("STAMINA"),
  move: { id: "TACKLE", type: "NORMAL", category: "Physical" },
  hit: false,
}).triggered, false);

assert.equal(resolveHitStatReactionCanonical({
  target: { ability: null, ability_id: "WEAKARMOR", held_item: null },
  move: { id: "TACKLE", type: "NORMAL", category: "Physical" },
  hit: true,
}).triggered, false);

assert.equal(resolveHitStatReactionCanonical({
  target: { ability_id: "WEAKARMOR" },
  move: { id: "TACKLE", type: "NORMAL", category: "Physical" },
  hit: true,
}).triggered, true);

{
  const result = resolveBattleAbilityItemHookCanonical({
    hook: "action_after",
    user: pokemon("NONE"),
    target: pokemon("STAMINA"),
    move: { id: "TACKLE", type: "NORMAL", category: "Physical" },
    damageDealt: 12,
    context: { hit: true, contact: false },
  });
  assert.equal(result.contactReactive.contact, false);
  assert.deepEqual(result.contactReactive.hitStatReaction.statChanges, [
    { subject: "target", stat: "DEFENSE", delta: 1 },
  ]);
  assert.deepEqual(result.contactReactive.statChanges, [
    { subject: "target", stat: "DEFENSE", delta: 1 },
  ]);
}

assert.equal(BATTLE_HIT_STAT_REACTION_COVERAGE_CANONICAL.abilityCount, 3);
assert.deepEqual(BATTLE_HIT_STAT_REACTION_COVERAGE_CANONICAL.classificationCounts, {
  physicalHitStatReactionAbilities: 1,
  anyHitStatReactionAbilities: 1,
  typeHitStatReactionAbilities: 1,
});

console.log("battle hit stat reaction smoke: PASS");
