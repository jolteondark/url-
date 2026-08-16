import { advanceDayAndRegenerateBoard } from "./mapless-day-board-advance.js";

function pokemonId(pokemon, index) {
  return pokemon?.personal_id ?? pokemon?.id ?? pokemon?.uuid ?? index;
}

function isEligibleWatcher(pokemon) {
  if (!pokemon || pokemon.is_egg === true || pokemon.egg === true) return false;
  if (pokemon.fainted === true) return false;
  if (Number.isFinite(pokemon.hp) && pokemon.hp <= 0) return false;
  return true;
}

function hasFireType(pokemon) {
  const types = Array.isArray(pokemon?.types) ? pokemon.types : [pokemon?.type, pokemon?.type1, pokemon?.type2];
  return types.some((type) => String(type ?? "").toUpperCase() === "FIRE");
}

export function resolveCampNextDay(input = {}) {
  const party = Array.isArray(input.party) ? input.party : [];
  const watcherIndex = party.findIndex(isEligibleWatcher);
  const watcher = watcherIndex >= 0 ? party[watcherIndex] : null;
  const watcherId = watcher ? pokemonId(watcher, watcherIndex) : null;
  const fireWatcher = watcher ? hasFireType(watcher) : false;

  const normalHpPercent = fireWatcher ? 30 : 20;
  const normalPpPercent = fireWatcher ? 20 : 10;
  const watcherHpPercent = watcher ? normalHpPercent / 2 : null;
  const watcherPpPercent = watcher ? normalPpPercent / 2 : null;

  const dayBoard = advanceDayAndRegenerateBoard({
    day: input.day,
    selected_index: input.selected_index,
    confirmed: input.confirmed,
    generation: input.generation
  });

  const recoveryOperations = input.confirmed === true ? [{
    op: "camp_recover_party",
    normal_hp_percent: normalHpPercent,
    normal_pp_percent: normalPpPercent,
    watcher_id: watcherId,
    watcher_hp_percent: watcherHpPercent,
    watcher_pp_percent: watcherPpPercent
  }] : [];

  return {
    result: input.confirmed === true,
    watcher_id: watcherId,
    fire_watcher: fireWatcher,
    normal_recovery: { hp_percent: normalHpPercent, pp_percent: normalPpPercent },
    watcher_recovery: watcher ? { hp_percent: watcherHpPercent, pp_percent: watcherPpPercent } : null,
    recovery_operations: recoveryOperations,
    day_board: dayBoard,
    continuation: input.confirmed === true ? {
      kind: "day_board",
      day: dayBoard.day,
      selected_index: dayBoard.selected_index,
      board_kinds: dayBoard.board_kinds,
      board_revealed: dayBoard.board_revealed,
      board_consumed: dayBoard.board_consumed
    } : null
  };
}
