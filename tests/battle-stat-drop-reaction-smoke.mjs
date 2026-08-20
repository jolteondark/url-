import assert from "node:assert/strict";
import {
  BATTLE_STAT_DROP_REACTION_COVERAGE_CANONICAL,
  resolveBattleStatDropReactionCanonical,
} from "../runtime/battle-core-stat-drop-reaction.js";
import { resolveIntimidateEntryReactionCanonical } from "../runtime/battle-core-ability-item-entry-extension.js";

const pokemon = (ability = null, heldItem = null, extra = {}) => ({
  ability,
  held_item: heldItem,
  ...extra,
});

const attackDrop = Object.freeze([{ subject: "target", stat: "ATTACK", delta: -1 }]);
const mixedDrops = Object.freeze([
  { subject: "target", stat: "ATTACK", delta: -1 },
  { subject: "target", stat: "SPEED", delta: -2 },
]);

{
  const result = resolveBattleStatDropReactionCanonical({
    source: pokemon("PRESSURE"),
    target: pokemon("CLEARBODY"),
    changes: mixedDrops,
  });
  assert.deepEqual(result.appliedChanges, []);
  assert.equal(result.blockedChanges.length, 2);
  assert.equal(result.reason, "stat_drop_blocked");
}

{
  const result = resolveBattleStatDropReactionCanonical({
    source: pokemon("MOLDBREAKER"),
    target: pokemon("CLEARBODY"),
    changes: attackDrop,
  });
  assert.deepEqual(result.appliedChanges, attackDrop);
  assert.equal(result.moldBreaker, true);
}

{
  const result = resolveBattleStatDropReactionCanonical({
    source: pokemon("PRESSURE"),
    target: pokemon("HYPERCUTTER"),
    changes: mixedDrops,
  });
  assert.deepEqual(result.appliedChanges, [{ subject: "target", stat: "SPEED", delta: -2 }]);
  assert.deepEqual(result.blockedChanges, [{ subject: "target", stat: "ATTACK", delta: -1 }]);
}

{
  const result = resolveBattleStatDropReactionCanonical({
    source: pokemon("MOLDBREAKER"),
    target: pokemon(null, "CLEARAMULET"),
    changes: mixedDrops,
  });
  assert.deepEqual(result.appliedChanges, []);
  assert.equal(result.blockedChanges.length, 2);
}

{
  const result = resolveBattleStatDropReactionCanonical({
    source: pokemon("PRESSURE"),
    target: pokemon("DEFIANT"),
    changes: mixedDrops,
  });
  assert.deepEqual(result.appliedChanges, mixedDrops);
  assert.deepEqual(result.reactionChanges, [
    { subject: "target", stat: "ATTACK", delta: 2 },
    { subject: "target", stat: "ATTACK", delta: 2 },
  ]);
}

{
  const result = resolveBattleStatDropReactionCanonical({
    source: pokemon("PRESSURE"),
    target: pokemon("COMPETITIVE"),
    changes: mixedDrops,
  });
  assert.deepEqual(result.reactionChanges, [
    { subject: "target", stat: "SPECIAL_ATTACK", delta: 2 },
    { subject: "target", stat: "SPECIAL_ATTACK", delta: 2 },
  ]);
}

{
  const result = resolveBattleStatDropReactionCanonical({
    source: pokemon("PRESSURE"),
    target: pokemon("DEFIANT"),
    changes: [{ subject: "target", stat: "SPEED", delta: -2 }],
  });
  assert.deepEqual(result.reactionChanges, [{ subject: "target", stat: "ATTACK", delta: 2 }]);
}

{
  const result = resolveBattleStatDropReactionCanonical({
    source: pokemon("PRESSURE"),
    target: pokemon("MIRRORARMOR"),
    changes: mixedDrops,
  });
  assert.deepEqual(result.appliedChanges, []);
  assert.deepEqual(result.reactionChanges, [
    { subject: "user", stat: "ATTACK", delta: -1 },
    { subject: "user", stat: "SPEED", delta: -2 },
  ]);
}

{
  const result = resolveBattleStatDropReactionCanonical({
    source: pokemon("MOLDBREAKER"),
    target: pokemon("MIRRORARMOR"),
    changes: attackDrop,
  });
  assert.deepEqual(result.appliedChanges, attackDrop);
  assert.deepEqual(result.reactionChanges, []);
}

{
  const selfDrop = resolveBattleStatDropReactionCanonical({
    source: pokemon("DEFIANT"),
    target: pokemon("DEFIANT"),
    changes: attackDrop,
    causedByOpponent: false,
  });
  assert.deepEqual(selfDrop.reactionChanges, []);
  assert.deepEqual(selfDrop.appliedChanges, attackDrop);
}

{
  const consumed = pokemon(null, null, { item: "CLEARAMULET" });
  const result = resolveBattleStatDropReactionCanonical({
    source: pokemon("PRESSURE"),
    target: consumed,
    changes: attackDrop,
  });
  assert.deepEqual(result.appliedChanges, attackDrop);
}

{
  const legacy = { item: "CLEARAMULET" };
  const result = resolveBattleStatDropReactionCanonical({
    source: pokemon("PRESSURE"),
    target: legacy,
    changes: attackDrop,
  });
  assert.deepEqual(result.appliedChanges, []);
}

{
  const intimidate = resolveIntimidateEntryReactionCanonical({
    source: pokemon("INTIMIDATE"),
    target: pokemon("DEFIANT"),
  });
  assert.equal(intimidate.replaceBaseChanges, false);
  assert.deepEqual(intimidate.changes, [{ subject: "target", stat: "ATTACK", delta: 2 }]);
}

assert.ok(BATTLE_STAT_DROP_REACTION_COVERAGE_CANONICAL.abilityIds.includes("BIGPECKS"));
assert.ok(BATTLE_STAT_DROP_REACTION_COVERAGE_CANONICAL.abilityIds.includes("DEFIANT"));
assert.ok(BATTLE_STAT_DROP_REACTION_COVERAGE_CANONICAL.abilityIds.includes("MIRRORARMOR"));
assert.ok(BATTLE_STAT_DROP_REACTION_COVERAGE_CANONICAL.itemIds.includes("CLEARAMULET"));
assert.equal(BATTLE_STAT_DROP_REACTION_COVERAGE_CANONICAL.classificationCounts.reactiveAbilities, 3);
assert.equal(BATTLE_STAT_DROP_REACTION_COVERAGE_CANONICAL.classificationCounts.statDropBlockingItems, 1);

console.log("battle stat-drop reaction smoke: PASS");
