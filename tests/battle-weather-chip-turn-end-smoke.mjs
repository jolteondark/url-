import assert from "node:assert/strict";
import {
  BATTLE_WEATHER_CHIP_TURN_END_COVERAGE_CANONICAL,
  resolveWeatherChipTurnEndCanonical,
} from "../runtime/battle-core-weather-chip-turn-end-extension.js";
import { commitBattleAbilityItemTurnEndRuntime } from "../runtime/battle-ability-item-turn-end-runtime.js";

const pokemon = (ability = "NONE", item = null, extra = {}) => ({
  ability,
  item,
  held_item: item,
  hp: 160,
  max_hp: 160,
  status: "NONE",
  types: ["NORMAL"],
  stats: { ATTACK: 100, DEFENSE: 100, SPECIAL_ATTACK: 100, SPECIAL_DEFENSE: 100, SPEED: 100 },
  ...extra,
});

{
  const sand = resolveWeatherChipTurnEndCanonical(pokemon(), { effectiveWeather: "Sandstorm" });
  assert.equal(sand.hpDelta, -10);
  assert.equal(sand.immune, false);
  assert.equal(sand.reason, "sandstorm_damage");

  for (const types of [["ROCK"], ["GROUND"], ["STEEL"]]) {
    assert.equal(resolveWeatherChipTurnEndCanonical(pokemon("NONE", null, { types }), { effectiveWeather: "Sandstorm" }).hpDelta, 0);
  }
  for (const ability of ["SANDVEIL", "SANDRUSH", "SANDFORCE", "OVERCOAT", "MAGICGUARD"]) {
    const result = resolveWeatherChipTurnEndCanonical(pokemon(ability), { effectiveWeather: "Sandstorm" });
    assert.equal(result.hpDelta, 0, `${ability} must block sandstorm chip`);
    assert.equal(result.immune, true);
  }
  assert.equal(resolveWeatherChipTurnEndCanonical(pokemon("NONE", "SAFETYGOGGLES"), { effectiveWeather: "Sandstorm" }).hpDelta, 0);
  assert.equal(resolveWeatherChipTurnEndCanonical(pokemon("SANDVEIL"), { effectiveWeather: "Sandstorm", abilitySuppressed: true }).hpDelta, -10);
  assert.equal(resolveWeatherChipTurnEndCanonical(pokemon("NONE", "SAFETYGOGGLES"), { effectiveWeather: "Sandstorm", itemSuppressed: true }).hpDelta, -10);
  assert.equal(resolveWeatherChipTurnEndCanonical(pokemon("KLUTZ", "SAFETYGOGGLES"), { effectiveWeather: "Sandstorm" }).hpDelta, -10);
}

{
  const hail = resolveWeatherChipTurnEndCanonical(pokemon(), { effectiveWeather: "Hail" });
  assert.equal(hail.hpDelta, -10);
  assert.equal(resolveWeatherChipTurnEndCanonical(pokemon("NONE", null, { types: ["ICE"] }), { effectiveWeather: "Hail" }).hpDelta, 0);
  for (const ability of ["ICEBODY", "SNOWCLOAK", "OVERCOAT", "MAGICGUARD"]) {
    assert.equal(resolveWeatherChipTurnEndCanonical(pokemon(ability), { effectiveWeather: "Hail" }).hpDelta, 0, `${ability} must block hail chip`);
  }
  assert.equal(resolveWeatherChipTurnEndCanonical(pokemon("NONE", "SAFETYGOGGLES"), { effectiveWeather: "Hail" }).hpDelta, 0);
  assert.equal(resolveWeatherChipTurnEndCanonical(pokemon("SLUSHRUSH"), { effectiveWeather: "Hail" }).hpDelta, -10, "Slush Rush must not grant hail damage immunity");
  assert.equal(resolveWeatherChipTurnEndCanonical(pokemon(), { effectiveWeather: "Snow" }).hpDelta, 0, "Gen 9 Snow must not deal hail chip damage");
}

{
  const staleItem = pokemon("NONE", "SAFETYGOGGLES");
  staleItem.held_item = null;
  assert.equal(resolveWeatherChipTurnEndCanonical(staleItem, { effectiveWeather: "Sandstorm" }).hpDelta, -10, "canonical held_item=null must beat stale pokemon.item");
}

{
  const shared = commitBattleAbilityItemTurnEndRuntime({
    pokemon: pokemon("NONE", "LEFTOVERS", { hp: 80 }),
    context: { effectiveWeather: "Sandstorm" },
  });
  assert.equal(shared.commit.weatherChip.hpDelta, -10);
  assert.equal(shared.commit.hpDelta, 0, "weather chip must resolve before Leftovers recovery");
  assert.equal(shared.pokemon.hp, 80);

  const faintBeforeRecovery = commitBattleAbilityItemTurnEndRuntime({
    pokemon: pokemon("NONE", "LEFTOVERS", { hp: 5 }),
    context: { effectiveWeather: "Sandstorm" },
  });
  assert.equal(faintBeforeRecovery.commit.weatherChip.hpDelta, -5);
  assert.equal(faintBeforeRecovery.commit.hpDelta, -5, "weather KO must prevent later Leftovers recovery");
  assert.equal(faintBeforeRecovery.pokemon.hp, 0);
}

assert.equal(BATTLE_WEATHER_CHIP_TURN_END_COVERAGE_CANONICAL.classificationCounts.weatherDamageAbilities, 7);
assert.equal(BATTLE_WEATHER_CHIP_TURN_END_COVERAGE_CANONICAL.classificationCounts.weatherDamageHeldItems, 1);
assert.ok(BATTLE_WEATHER_CHIP_TURN_END_COVERAGE_CANONICAL.abilityIds.includes("SANDVEIL"));
assert.ok(BATTLE_WEATHER_CHIP_TURN_END_COVERAGE_CANONICAL.itemIds.includes("SAFETYGOGGLES"));

console.log("battle weather chip turn-end smoke: PASS");
