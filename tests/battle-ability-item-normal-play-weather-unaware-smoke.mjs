import assert from "node:assert/strict";
import {
  BATTLE_ABILITY_ITEM_NORMAL_PLAY_EXTENSION_COVERAGE_CANONICAL,
  resolveNormalPlayActionBeforeAbilityItemExtensionCanonical,
} from "../runtime/battle-core-ability-item-normal-play-extension.js";

const pokemon = (ability = "NONE", held_item = null, extra = {}) => ({ ability, held_item, ...extra });

{
  const sunny = resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({
    user: pokemon("CHLOROPHYLL"), target: pokemon(), move: { category: "Status" }, context: { effectiveWeather: "Sun" },
  });
  assert.equal(sunny.speedInput.abilityMultiplier, 2);
  const dry = resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({
    user: pokemon("CHLOROPHYLL"), target: pokemon(), move: { category: "Status" }, context: { effectiveWeather: "Rain" },
  });
  assert.equal(dry.speedInput.abilityMultiplier, 1);
}

for (const [ability, weather] of [["SWIFTSWIM", "Rain"], ["SANDRUSH", "Sandstorm"], ["SLUSHRUSH", "Snow"]]) {
  const result = resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({
    user: pokemon(ability), target: pokemon(), move: { category: "Physical" }, context: { effectiveWeather: weather },
  });
  assert.equal(result.speedInput.abilityMultiplier, 2, `${ability} should double Speed in ${weather}`);
}

{
  const result = resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({
    user: pokemon("VICTORYSTAR"), target: pokemon(), move: { category: "Special" },
  });
  assert.equal(result.accuracyModifierInput.externalAccuracyMultiplier, 1.1);
}

{
  const solar = resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({
    user: pokemon("SOLARPOWER"), target: pokemon(), move: { category: "Special" }, context: { effectiveWeather: "HarshSun" },
  });
  assert.equal(solar.damageMultiplierInput.externalAttackMultiplier, 1.5);
  const physical = resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({
    user: pokemon("SOLARPOWER"), target: pokemon(), move: { category: "Physical" }, context: { effectiveWeather: "Sun" },
  });
  assert.equal(physical.damageMultiplierInput.externalAttackMultiplier, 1);
}

{
  const userUnaware = resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({
    user: pokemon("UNAWARE"), target: pokemon(), move: { category: "Physical" },
  });
  assert.equal(userUnaware.damageCalculationInput.userUnaware, true);
  const targetUnaware = resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({
    user: pokemon(), target: pokemon("UNAWARE"), move: { category: "Physical" },
  });
  assert.equal(targetUnaware.damageCalculationInput.targetUnaware, true);
  const bypass = resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({
    user: pokemon("MOLDBREAKER"), target: pokemon("UNAWARE"), move: { category: "Physical" },
  });
  assert.equal(bypass.damageCalculationInput.targetUnaware, false);
}

{
  const stale = resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({
    user: { ability: null, ability_id: "CHLOROPHYLL", held_item: null, item: "ASSAULTVEST" },
    target: pokemon(), move: { category: "Status" }, context: { effectiveWeather: "Sun" },
  });
  assert.equal(stale.speedInput.abilityMultiplier, 1);
  assert.equal(stale.moveSelection.blocked, false);
}

assert.equal(BATTLE_ABILITY_ITEM_NORMAL_PLAY_EXTENSION_COVERAGE_CANONICAL.classificationCounts.weatherSpeedModifier, 4);
assert.equal(BATTLE_ABILITY_ITEM_NORMAL_PLAY_EXTENSION_COVERAGE_CANONICAL.classificationCounts.statStageIgnore, 1);
console.log("battle ability/item normal-play weather/unaware smoke: PASS");
