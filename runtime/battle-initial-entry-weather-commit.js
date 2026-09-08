import { browserBattleRandomSeed } from "./battle-browser-random-seed.js";
import { calculatePriorityCanonical } from "./battle-core-priority.js";
import { resolveOrdinaryPokemonSpeedCanonical } from "./battle-core-speed.js";
import { commitSwitchInEntryWeatherCanonical } from "./battle-switch-in-entry-weather-commit.js";

function normalizedEntrants(entrants) {
  if (!Array.isArray(entrants) || entrants.length === 0) throw new TypeError("initial battle entrants are required");
  return entrants.map((entry, actionIndex) => {
    const battlerIndex = Number(entry?.battlerIndex);
    const pokemon = entry?.pokemon;
    if (!Number.isInteger(battlerIndex) || battlerIndex < 0) throw new TypeError("initial entrant battlerIndex must be a non-negative integer");
    if (!pokemon || typeof pokemon !== "object" || Array.isArray(pokemon)) throw new TypeError("initial entrant Pokemon is required");
    return { actionIndex, battlerIndex, pokemon };
  });
}

export function commitInitialEntryWeatherCanonical({
  battle,
  entrants,
  priorityRandomSeed = browserBattleRandomSeed(),
} = {}) {
  if (!battle || typeof battle !== "object" || Array.isArray(battle)) throw new TypeError("battle state is required");
  if (battle.completed) return Object.freeze({ committed: false, reason: "battle_completed", order: Object.freeze([]), resolutions: Object.freeze([]) });
  if (battle.initial_entry_weather_committed === true) {
    return Object.freeze({ committed: false, reason: "already_committed", order: Object.freeze([]), resolutions: Object.freeze([]) });
  }

  const active = normalizedEntrants(entrants);
  const entries = active.map(({ actionIndex, battlerIndex, pokemon }) => ({
    actionIndex,
    battlerIndex,
    speed: resolveOrdinaryPokemonSpeedCanonical(pokemon),
  }));
  const priority = calculatePriorityCanonical(entries, {
    onlySpeedSort: true,
    randomSeed: Number(priorityRandomSeed) & 0x7fffffff,
  });
  const byActionIndex = new Map(active.map((entry) => [entry.actionIndex, entry]));
  const resolutions = [];
  for (const actionIndex of priority.order) {
    const entrant = byActionIndex.get(Number(actionIndex));
    if (!entrant) throw new Error(`canonical initial-entry order references unknown action ${actionIndex}`);
    const resolution = commitSwitchInEntryWeatherCanonical({ battle, pokemon: entrant.pokemon });
    resolutions.push(Object.freeze({
      actionIndex: entrant.actionIndex,
      battlerIndex: entrant.battlerIndex,
      triggered: Boolean(resolution?.triggered),
      entryWeather: resolution == null ? null : structuredClone(resolution),
    }));
  }
  battle.initial_entry_weather_committed = true;
  return Object.freeze({
    committed: true,
    reason: "committed",
    priorityRandomSeed: Number(priorityRandomSeed) & 0x7fffffff,
    order: Object.freeze(priority.order.map(Number)),
    resolutions: Object.freeze(resolutions),
  });
}
