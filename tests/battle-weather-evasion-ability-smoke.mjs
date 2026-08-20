import assert from "node:assert/strict";
import {
  BATTLE_ABILITY_ITEM_SHARED_HOOK_CONTRACT_CANONICAL,
  resolveBattleAbilityItemHookCanonical,
} from "../runtime/battle-ability-item-hook-dispatch.js";

const pokemon = (ability = "NONE") => ({
  ability,
  held_item: null,
  status: "NONE",
  hp: 100,
  max_hp: 100,
  types: ["NORMAL"],
  stats: { ATTACK: 100, DEFENSE: 100, SPECIAL_ATTACK: 100, SPECIAL_DEFENSE: 100, SPEED: 100 },
});

function actionBefore({ userAbility = "NONE", targetAbility = "NONE", weather = "", moveType = "NORMAL" } = {}) {
  return resolveBattleAbilityItemHookCanonical({
    hook: "action_before",
    user: pokemon(userAbility),
    target: pokemon(targetAbility),
    move: { id: "TESTMOVE", type: moveType, category: "Physical", power: 60, accuracy: 100 },
    selectedMoveId: "TESTMOVE",
    context: { effectiveWeather: weather },
  });
}

{
  const result = actionBefore({ targetAbility: "SANDVEIL", weather: "Sandstorm" });
  assert.equal(result.modifiers.accuracyModifierInput.externalAccuracyMultiplier, 0.8);
}

for (const weather of ["Hail", "Snow"]) {
  const result = actionBefore({ targetAbility: "SNOWCLOAK", weather });
  assert.equal(result.modifiers.accuracyModifierInput.externalAccuracyMultiplier, 0.8, weather);
}

{
  const noWeather = actionBefore({ targetAbility: "SANDVEIL", weather: "Rain" });
  assert.equal(noWeather.modifiers.accuracyModifierInput.externalAccuracyMultiplier, 1);
  const moldBreaker = actionBefore({ userAbility: "MOLDBREAKER", targetAbility: "SANDVEIL", weather: "Sandstorm" });
  assert.equal(moldBreaker.modifiers.accuracyModifierInput.externalAccuracyMultiplier, 1);
}

const coverage = BATTLE_ABILITY_ITEM_SHARED_HOOK_CONTRACT_CANONICAL.implementedCoverage;
for (const ability of ["SANDVEIL", "SNOWCLOAK"]) assert.ok(coverage.abilityIds.includes(ability));
assert.equal(coverage.classificationCounts.normalPlayExtension.weatherEvasionAbilities, 2);

console.log("battle weather evasion ability smoke: PASS");
