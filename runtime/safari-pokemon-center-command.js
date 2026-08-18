import { resolveMaplessPokemonCenterHealing } from "./mapless-pokemon-center-healing.js";
import { SAFARI_MOVE_MASTERS } from "./safari-playable-data.js";
import {
  pokemonMoveTotalPp,
  setPokemonRuntimeMovePp,
  updatePokemonRuntime,
} from "./pokemon-runtime.js";
import { interactiveSafariStreetPerformer } from "./safari-street-performer-interaction.js";
import { interactiveSafariMushroomField } from "./safari-mushroom-field-interaction.js";
import { activateSafariDayBoardCell as activateSafariDayBoardCellBase } from "./safari-playable-integration-wounded.js";

function moveId(move) {
  return typeof move === "string" ? move : move?.id;
}

function healPokemon(pokemon) {
  let healed = updatePokemonRuntime(pokemon, {
    hp: pokemon.max_hp ?? pokemon.hp ?? 1,
    status: "NONE",
    status_count: 0,
  });
  for (let index = 0; index < healed.moves.length; index += 1) {
    const move = healed.moves[index];
    const master = SAFARI_MOVE_MASTERS[moveId(move)];
    if (!master || !Number.isInteger(master.total_pp)) continue;
    const ppup = typeof move === "string" ? 0 : Number(move.ppup ?? 0);
    const totalPp = pokemonMoveTotalPp(master.total_pp, Number.isInteger(ppup) && ppup >= 0 ? ppup : 0);
    healed = setPokemonRuntimeMovePp(healed, index, totalPp, master.total_pp);
  }
  return healed;
}

export function activateSafariDayBoardCell(runtime, index) {
  const state = runtime?.variables?.mapless;
  const event = state?.board_events?.[index];
  if (event?.kind === "normal_event") {
    if (event.normal_event_id === "street_performer") return interactiveSafariStreetPerformer(runtime, index);
    if (event.normal_event_id === "mushroom_field") return interactiveSafariMushroomField(runtime, index);
  }
  if (!event || event.kind !== "center") return activateSafariDayBoardCellBase(runtime, index);

  const owner = resolveMaplessPokemonCenterHealing({ player: runtime?.player });
  if (!owner.healed) {
    state.notice = "回復できませんでした。";
    state.last_operations = owner.operations;
    return {
      runtime,
      result: owner.result,
      boundary: "center",
      notice: state.notice,
      operations: owner.operations,
      centerOwner: owner,
    };
  }

  const result = activateSafariDayBoardCellBase(runtime, index);
  runtime.player.party = runtime.player.party.map(healPokemon);
  state.last_operations = [
    ...(Array.isArray(state.last_operations) ? state.last_operations : []),
    { op: "pokemon_center_owner", result: owner.result, operations: owner.operations.map((operation) => ({ ...operation })) },
  ];
  return {
    ...result,
    runtime,
    operations: state.last_operations,
    centerOwner: owner,
    persistenceRequested: true,
  };
}
