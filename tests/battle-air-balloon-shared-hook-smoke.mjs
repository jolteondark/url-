import assert from "node:assert/strict";
import {
  BATTLE_AIR_BALLOON_COVERAGE_CANONICAL,
  resolveAirBalloonActionAfterCanonical,
  resolveAirBalloonActionBeforeCanonical,
} from "../runtime/battle-core-air-balloon-extension.js";
import {
  BATTLE_ABILITY_ITEM_SHARED_IMPLEMENTED_COVERAGE_CANONICAL,
  resolveBattleAbilityItemHookCanonical,
} from "../runtime/battle-ability-item-hook-dispatch.js";

const pokemon = (heldItem, ability = "NONE") => ({
  ability,
  held_item: heldItem,
  item: heldItem,
  hp: 100,
  max_hp: 100,
  types: ["NORMAL"],
});

const groundMove = Object.freeze({ id: "EARTHQUAKE", type: "GROUND", category: "Physical", power: 100 });
const normalMove = Object.freeze({ id: "TACKLE", type: "NORMAL", category: "Physical", power: 40 });

assert.deepEqual(BATTLE_AIR_BALLOON_COVERAGE_CANONICAL.itemIds, ["AIRBALLOON"]);
assert.ok(BATTLE_ABILITY_ITEM_SHARED_IMPLEMENTED_COVERAGE_CANONICAL.itemIds.includes("AIRBALLOON"));
assert.equal(BATTLE_ABILITY_ITEM_SHARED_IMPLEMENTED_COVERAGE_CANONICAL.classificationCounts.airBalloonExtension.typeImmunityHeldItems, 1);

{
  const result = resolveBattleAbilityItemHookCanonical({
    hook: "action_before",
    user: pokemon(null, "MOLDBREAKER"),
    target: pokemon("AIRBALLOON"),
    move: groundMove,
  });
  assert.equal(result.airBalloon.immune, true);
  assert.equal(result.modifiers.typeImmunity, true);
  assert.equal(result.modifiers.typeImmunityResolution.source, "held_item_air_balloon");
}

{
  const result = resolveAirBalloonActionBeforeCanonical({
    target: pokemon("AIRBALLOON"),
    move: groundMove,
    context: { gravityActive: true },
  });
  assert.equal(result.immune, false);
  assert.equal(result.grounded, true);
}

{
  const result = resolveAirBalloonActionBeforeCanonical({
    target: pokemon("AIRBALLOON", "KLUTZ"),
    move: groundMove,
  });
  assert.equal(result.immune, false);
  assert.equal(result.suppressed, true);
}

{
  const result = resolveBattleAbilityItemHookCanonical({
    hook: "action_after",
    target: pokemon("AIRBALLOON"),
    move: normalMove,
    damageDealt: 24,
  });
  assert.equal(result.targetAirBalloon.triggered, true);
  assert.deepEqual(result.targetAirBalloon.consumeRequest, {
    item: "AIRBALLOON",
    itemIsBerry: false,
    effectKind: "air_balloon_burst",
    permanent: true,
  });
}

{
  const result = resolveAirBalloonActionAfterCanonical({
    target: pokemon("AIRBALLOON"),
    move: normalMove,
    damageDealt: 0,
    context: { hit: true },
  });
  assert.equal(result.triggered, true);
}

{
  const result = resolveAirBalloonActionAfterCanonical({
    target: { ...pokemon(null), item: "AIRBALLOON" },
    move: normalMove,
    damageDealt: 30,
  });
  assert.equal(result.triggered, false, "authoritative held_item=null must suppress stale item alias");
}

{
  const legacy = { ability_id: "NONE", item: "AIRBALLOON", hp: 100, max_hp: 100, types: ["NORMAL"] };
  assert.equal(resolveAirBalloonActionBeforeCanonical({ target: legacy, move: groundMove }).immune, true);
}

console.log("battle Air Balloon shared hook smoke: PASS");
