import assert from "node:assert/strict";
import {
  BATTLE_ABILITY_ITEM_ENTRY_EXTENSION_COVERAGE_CANONICAL,
  resolveIntimidateEntryReactionCanonical,
} from "../runtime/battle-core-ability-item-entry-extension.js";

const pokemon = (ability = "NONE", heldItem = null, extra = {}) => ({
  ability,
  held_item: heldItem,
  item: heldItem,
  ...extra,
});

for (const ability of ["CLEARBODY", "WHITESMOKE", "FULLMETALBODY", "HYPERCUTTER"]) {
  const result = resolveIntimidateEntryReactionCanonical({
    source: pokemon("INTIMIDATE"),
    target: pokemon(ability),
  });
  assert.equal(result.blocksAttackDrop, true, `${ability} must block Intimidate's Attack drop`);
  assert.equal(result.replaceBaseChanges, true);
  assert.deepEqual(result.changes, []);
}

{
  const result = resolveIntimidateEntryReactionCanonical({
    source: pokemon("INTIMIDATE"),
    target: pokemon("GUARDDOG"),
  });
  assert.equal(result.replaceBaseChanges, true);
  assert.deepEqual(result.changes, [{ subject: "target", stat: "ATTACK", delta: 1 }]);
}

{
  const result = resolveIntimidateEntryReactionCanonical({
    source: pokemon("INTIMIDATE"),
    target: pokemon("DEFIANT"),
  });
  assert.equal(result.replaceBaseChanges, false);
  assert.deepEqual(result.changes, [{ subject: "target", stat: "ATTACK", delta: 2 }]);
}

{
  const result = resolveIntimidateEntryReactionCanonical({
    source: pokemon("INTIMIDATE"),
    target: pokemon("COMPETITIVE"),
  });
  assert.equal(result.replaceBaseChanges, false);
  assert.deepEqual(result.changes, [{ subject: "target", stat: "SPECIAL_ATTACK", delta: 2 }]);
}

{
  const result = resolveIntimidateEntryReactionCanonical({
    source: pokemon("INTIMIDATE"),
    target: pokemon("MIRRORARMOR"),
  });
  assert.equal(result.blocksAttackDrop, true);
  assert.equal(result.replaceBaseChanges, true);
  assert.deepEqual(result.changes, [{ subject: "user", stat: "ATTACK", delta: -1 }]);
  assert.equal(result.consumeRequest, null);
}

{
  const result = resolveIntimidateEntryReactionCanonical({
    source: pokemon("INTIMIDATE"),
    target: pokemon("RATTLED"),
  });
  assert.equal(result.replaceBaseChanges, false);
  assert.deepEqual(result.changes, [{ subject: "target", stat: "SPEED", delta: 1 }]);
}

{
  const result = resolveIntimidateEntryReactionCanonical({
    source: pokemon("INTIMIDATE"),
    target: pokemon("NONE", "ADRENALINEORB"),
  });
  assert.deepEqual(result.changes, [{ subject: "target", stat: "SPEED", delta: 1 }]);
  assert.equal(result.consumeRequest.item, "ADRENALINEORB");
  assert.equal(result.consumeRequest.permanent, true);
}

{
  const consumed = resolveIntimidateEntryReactionCanonical({
    source: pokemon("INTIMIDATE"),
    target: pokemon("NONE", null, { item: "ADRENALINEORB" }),
  });
  assert.equal(consumed.consumeRequest, null, "held_item=null must suppress stale compatibility item aliases");
}

{
  const legacy = resolveIntimidateEntryReactionCanonical({
    source: { ability_id: "INTIMIDATE" },
    target: { ability_id: "RATTLED", item: "ADRENALINEORB" },
  });
  assert.equal(legacy.changes.length, 2, "legacy aliases remain fallback-only when canonical fields are absent");
  assert.equal(legacy.consumeRequest.item, "ADRENALINEORB");
}

{
  const unrelated = resolveIntimidateEntryReactionCanonical({
    source: pokemon("DOWNLOAD"),
    target: pokemon("GUARDDOG", "ADRENALINEORB"),
  });
  assert.equal(unrelated.applies, false);
  assert.deepEqual(unrelated.changes, []);
  assert.equal(unrelated.consumeRequest, null);
}

assert.equal(BATTLE_ABILITY_ITEM_ENTRY_EXTENSION_COVERAGE_CANONICAL.abilityCount, 9);
assert.equal(BATTLE_ABILITY_ITEM_ENTRY_EXTENSION_COVERAGE_CANONICAL.itemCount, 1);
assert.equal(BATTLE_ABILITY_ITEM_ENTRY_EXTENSION_COVERAGE_CANONICAL.classificationCounts.intimidateStatDropBlockers, 4);
assert.equal(BATTLE_ABILITY_ITEM_ENTRY_EXTENSION_COVERAGE_CANONICAL.classificationCounts.intimidateReactiveAbilities, 5);

console.log("battle ability/item entry extension smoke: PASS");