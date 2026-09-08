import assert from "node:assert/strict";
import { commitInitialEntryWeatherCanonical } from "../runtime/battle-initial-entry-weather-commit.js";

function pokemon(abilityId, speed) {
  return {
    species: abilityId === "DRIZZLE" ? "POLITOED" : "NINETALES",
    ability_id: abilityId,
    status: "NONE",
    stats: { SPEED: speed },
  };
}

const fasterDrought = pokemon("DROUGHT", 120);
const slowerDrizzle = pokemon("DRIZZLE", 80);
const battle = { completed: false };
const first = commitInitialEntryWeatherCanonical({
  battle,
  entrants: [
    { battlerIndex: 0, pokemon: fasterDrought },
    { battlerIndex: 1, pokemon: slowerDrizzle },
  ],
  priorityRandomSeed: 123,
});
assert.equal(first.committed, true);
assert.deepEqual(first.order, [0, 1], "faster entrant must trigger first");
assert.equal(first.resolutions.length, 2, "both initial entrants must pass through the shared switch-in hook exactly once");
assert.equal(battle.initial_entry_weather_committed, true);

const weatherAfterFirstCommit = structuredClone(battle.battle_weather_state ?? null);
const second = commitInitialEntryWeatherCanonical({
  battle,
  entrants: [
    { battlerIndex: 0, pokemon: fasterDrought },
    { battlerIndex: 1, pokemon: slowerDrizzle },
  ],
  priorityRandomSeed: 456,
});
assert.equal(second.committed, false);
assert.equal(second.reason, "already_committed");
assert.deepEqual(battle.battle_weather_state ?? null, weatherAfterFirstCommit, "re-entry into the start adapter must not commit weather twice");

const tieBattleA = { completed: false };
const tieBattleB = { completed: false };
const tiedA = commitInitialEntryWeatherCanonical({
  battle: tieBattleA,
  entrants: [
    { battlerIndex: 0, pokemon: pokemon("DRIZZLE", 100) },
    { battlerIndex: 1, pokemon: pokemon("DROUGHT", 100) },
  ],
  priorityRandomSeed: 98765,
});
const tiedB = commitInitialEntryWeatherCanonical({
  battle: tieBattleB,
  entrants: [
    { battlerIndex: 0, pokemon: pokemon("DRIZZLE", 100) },
    { battlerIndex: 1, pokemon: pokemon("DROUGHT", 100) },
  ],
  priorityRandomSeed: 98765,
});
assert.deepEqual(tiedA.order, tiedB.order, "same-speed initial entry order must use the shared seeded Ruby-MT priority owner deterministically");

console.log("battle initial entry-weather owner smoke: ok");
