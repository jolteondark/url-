import assert from "node:assert/strict";
import { resolveMoveOrderAbilityItemExtensionCanonical } from "../runtime/battle-core-ability-item-move-order-extension.js";

function pokemon(ability = null, heldItem = null, extra = {}) {
  return { ability, held_item: heldItem, hp: 100, max_hp: 100, ...extra };
}

{
  const unknownCategory = resolveMoveOrderAbilityItemExtensionCanonical({
    user: pokemon("QUICKDRAW"),
    move: { id: "UNKNOWN", priority: 0 },
    abilityRandomRoll: 0,
  });
  assert.equal(unknownCategory.forceFirstWithinPriority, false);
  assert.equal(unknownCategory.abilitySubPriority, 0);
}

{
  const quickClawOverridesStall = resolveMoveOrderAbilityItemExtensionCanonical({
    user: pokemon("STALL", "QUICKCLAW"),
    move: { id: "TACKLE", category: "Physical", priority: 0 },
    itemRandomRoll: 0,
  });
  assert.equal(quickClawOverridesStall.effectiveSubPriority, 1);
  assert.equal(quickClawOverridesStall.forceFirstWithinPriority, true);
  assert.equal(quickClawOverridesStall.forceLastWithinPriority, false);
  assert.equal(quickClawOverridesStall.source, "QUICKCLAW");
}

{
  const quickDrawOverridesLaggingTail = resolveMoveOrderAbilityItemExtensionCanonical({
    user: pokemon("QUICKDRAW", "LAGGINGTAIL"),
    move: { id: "TACKLE", category: "Physical", priority: 0 },
    abilityRandomRoll: 0,
  });
  assert.equal(quickDrawOverridesLaggingTail.effectiveSubPriority, 1);
  assert.equal(quickDrawOverridesLaggingTail.forceFirstWithinPriority, true);
  assert.equal(quickDrawOverridesLaggingTail.forceLastWithinPriority, false);
  assert.equal(quickDrawOverridesLaggingTail.source, "QUICKDRAW");
}

console.log("battle ability/item move-order precedence smoke: PASS");
