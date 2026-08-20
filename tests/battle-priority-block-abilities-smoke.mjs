import assert from "node:assert/strict";
import {
  BATTLE_ABILITY_ITEM_NORMAL_PLAY_EXTENSION_COVERAGE_CANONICAL,
  resolveNormalPlayActionBeforeAbilityItemExtensionCanonical,
} from "../runtime/battle-core-ability-item-normal-play-extension.js";

const pokemon = (ability) => ({ ability, held_item: null, hp: 100, max_hp: 100, status: "NONE" });
const priorityMove = { id: "QUICKATTACK", type: "NORMAL", category: "Physical", power: 40 };

for (const ability of ["DAZZLING", "QUEENLYMAJESTY", "ARMORTAIL"]) {
  const blocked = resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({
    user: pokemon("NONE"),
    target: pokemon(ability),
    move: priorityMove,
    context: { effectivePriority: 1, targetsOpponent: true },
  });
  assert.equal(blocked.movePriorityBlock.blocked, true, ability);
  assert.equal(blocked.movePriorityBlock.reason, "target_priority_block_ability", ability);
  assert.equal(blocked.movePriorityBlock.targetAbility, ability, ability);

  const moldBreaker = resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({
    user: pokemon("MOLDBREAKER"),
    target: pokemon(ability),
    move: priorityMove,
    context: { effectivePriority: 1, targetsOpponent: true },
  });
  assert.equal(moldBreaker.movePriorityBlock.blocked, false, `${ability} Mold Breaker`);
}

const ordinary = resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({
  user: pokemon("NONE"),
  target: pokemon("DAZZLING"),
  move: priorityMove,
  context: { effectivePriority: 0, targetsOpponent: true },
});
assert.equal(ordinary.movePriorityBlock.blocked, false);

const selfTarget = resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({
  user: pokemon("NONE"),
  target: pokemon("DAZZLING"),
  move: { id: "PROTECT", type: "NORMAL", category: "Status", power: 0 },
  context: { effectivePriority: 4, targetsOpponent: false },
});
assert.equal(selfTarget.movePriorityBlock.blocked, false);

for (const ability of ["DAZZLING", "QUEENLYMAJESTY", "ARMORTAIL"]) {
  assert.ok(BATTLE_ABILITY_ITEM_NORMAL_PLAY_EXTENSION_COVERAGE_CANONICAL.abilityIds.includes(ability));
}
assert.equal(BATTLE_ABILITY_ITEM_NORMAL_PLAY_EXTENSION_COVERAGE_CANONICAL.classificationCounts.priorityBlockAbilities, 3);

console.log("battle priority-block abilities smoke: PASS");
