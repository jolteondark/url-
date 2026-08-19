import assert from "node:assert/strict";
import {
  BATTLE_STATUS_CURE_BERRY_COVERAGE_CANONICAL,
  resolveStatusCureBerryHookCanonical,
} from "../runtime/battle-core-status-cure-berry-extension.js";
import {
  BATTLE_ABILITY_ITEM_SHARED_IMPLEMENTED_COVERAGE_CANONICAL,
  resolveBattleAbilityItemHookCanonical,
} from "../runtime/battle-ability-item-hook-dispatch.js";
import { resolveHeldItemLifecycle } from "../runtime/battle-held-item-consumption-flow.js";
import { cureStatus } from "../runtime/battle-status-pp-flow.js";

const pokemon = (heldItem, status, extra = {}) => ({
  ability: "NONE",
  held_item: heldItem,
  item: heldItem,
  status,
  status_count: status === "SLEEP" ? 2 : 0,
  hp: 100,
  max_hp: 100,
  ...extra,
});

const cases = [
  ["CHERIBERRY", "PARALYSIS"],
  ["CHESTOBERRY", "SLEEP"],
  ["PECHABERRY", "POISON"],
  ["RAWSTBERRY", "BURN"],
  ["ASPEARBERRY", "FROZEN"],
];
for (const [item, status] of cases) {
  const result = resolveStatusCureBerryHookCanonical(pokemon(item, status));
  assert.equal(result.triggered, true, `${item} must cure ${status}`);
  assert.equal(result.statusCureRequest.kind, "cure");
  assert.equal(result.statusCureRequest.expectedStatus, status);
  assert.equal(result.consumeRequest.item, item);
  assert.equal(result.consumeRequest.permanent, true);
}

{
  const lum = resolveStatusCureBerryHookCanonical(pokemon("LUMBERRY", "BURN"));
  assert.equal(lum.triggered, true);
  assert.equal(lum.statusCureRequest.expectedStatus, "BURN");
  const noMajorStatus = resolveStatusCureBerryHookCanonical(pokemon("LUMBERRY", "NONE"));
  assert.equal(noMajorStatus.triggered, false);
  assert.equal(noMajorStatus.consumeRequest, null);
}

{
  const mismatch = resolveStatusCureBerryHookCanonical(pokemon("CHESTOBERRY", "POISON"));
  assert.equal(mismatch.triggered, false, "specific berries must not cure a different major status");
  const fainted = resolveStatusCureBerryHookCanonical(pokemon("PECHABERRY", "POISON", { hp: 0 }));
  assert.equal(fainted.triggered, false, "held items must not activate for a fainted Pokemon");
}

{
  const staleAlias = resolveStatusCureBerryHookCanonical({
    ability: "NONE",
    held_item: null,
    item: "LUMBERRY",
    status: "BURN",
    hp: 100,
    max_hp: 100,
  });
  assert.equal(staleAlias.triggered, false, "held_item=null must remain authoritative over a stale item alias");
  const legacy = resolveStatusCureBerryHookCanonical({ item: "LUMBERRY", status: "BURN", hp: 100, max_hp: 100 });
  assert.equal(legacy.triggered, true, "legacy objects without held_item keep compatibility fallback");
}

{
  const hook = resolveBattleAbilityItemHookCanonical({
    hook: "action_after",
    user: pokemon(null, "NONE"),
    target: pokemon("CHERIBERRY", "PARALYSIS"),
    move: { id: "THUNDERWAVE", category: "Status" },
    damageDealt: 0,
  });
  assert.equal(hook.targetStatusBerry.triggered, true);
  assert.equal(hook.targetStatusBerry.statusCureRequest.kind, "cure");
}

{
  const result = resolveStatusCureBerryHookCanonical(pokemon("CHESTOBERRY", "SLEEP"));
  const cured = cureStatus({
    state: { status: "SLEEP", statusCount: 2, toxic: 0, outrage: 0, currentMove: null, truant: false },
    ...result.statusCureRequest,
  });
  assert.equal(cured.state.status, "NONE");
  assert.equal(cured.state.statusCount, 0);
  const consumed = resolveHeldItemLifecycle({
    state: { item: "CHESTOBERRY", pokemonItem: "CHESTOBERRY", initialItem: "CHESTOBERRY" },
    ...result.consumeRequest,
  });
  assert.equal(consumed.state.pokemonItem, null);
  assert.equal(consumed.state.initialItem, null, "permanent consumption must prevent Save/Continue resurrection");
}

assert.equal(BATTLE_STATUS_CURE_BERRY_COVERAGE_CANONICAL.itemCount, 6);
for (const item of ["CHERIBERRY", "CHESTOBERRY", "PECHABERRY", "RAWSTBERRY", "ASPEARBERRY", "LUMBERRY"]) {
  assert.ok(BATTLE_ABILITY_ITEM_SHARED_IMPLEMENTED_COVERAGE_CANONICAL.itemIds.includes(item));
}
assert.equal(
  BATTLE_ABILITY_ITEM_SHARED_IMPLEMENTED_COVERAGE_CANONICAL.classificationCounts.statusCureBerryExtension.majorStatusCureBerries,
  6,
);

console.log("battle status-cure berry shared hook smoke: PASS");
