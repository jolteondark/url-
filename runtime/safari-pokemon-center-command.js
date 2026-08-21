import { resolveMaplessPokemonCenterHealing } from "./mapless-pokemon-center-healing.js";
import { SAFARI_MOVE_MASTERS } from "./safari-playable-data.js";
import {
  pokemonMoveTotalPp,
  setPokemonRuntimeMovePp,
  updatePokemonRuntime,
} from "./pokemon-runtime.js";
import { interactiveSafariStreetPerformer } from "./safari-street-performer-interaction.js";
import { interactiveSafariMushroomField } from "./safari-mushroom-field-interaction.js";
import { interactiveSafariHotSpring } from "./safari-hot-spring-interaction.js";
import { interactiveSafariFakeNurse } from "./safari-fake-nurse-interaction.js";
import { interactiveSafariTravelingCook } from "./safari-traveling-cook-interaction.js";
import { interactiveSafariFloodedRiver } from "./safari-flooded-river-interaction.js";
import { interactiveSafariBuriedItem } from "./safari-buried-item-interaction.js";
import { interactiveSafariEggShop } from "./safari-egg-shop-interaction.js";
import { openSafariTreasureTouch } from "./safari-treasure-chest-interaction.js";
import { openSafariMinerTouch } from "./safari-miner-interaction.js";
import { openSafariTavernTouch } from "./safari-tavern-interaction.js";
import { openSafariNormalEventTouch, supportsSafariNormalEventTouch } from "./safari-normal-event-touch-handoff.js";
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
    if (typeof globalThis.document !== "undefined" && supportsSafariNormalEventTouch(event.normal_event_id)) {
      return openSafariNormalEventTouch(runtime, index);
    }
    if (event.normal_event_id === "street_performer") return interactiveSafariStreetPerformer(runtime, index);
    if (event.normal_event_id === "mushroom_field") return interactiveSafariMushroomField(runtime, index);
    if (event.normal_event_id === "hot_spring") return interactiveSafariHotSpring(runtime, index);
    if (event.normal_event_id === "fake_nurse") return interactiveSafariFakeNurse(runtime, index);
    if (event.normal_event_id === "traveling_cook") return interactiveSafariTravelingCook(runtime, index);
    if (event.normal_event_id === "flooded_river") return interactiveSafariFloodedRiver(runtime, index);
  }
  if (event?.kind === "treasure" && typeof globalThis.document !== "undefined") return openSafariTreasureTouch(runtime, index);
  if (event?.kind === "miner" && typeof globalThis.document !== "undefined") return openSafariMinerTouch(runtime, index);
  if (event?.kind === "tavern" && typeof globalThis.document !== "undefined") return openSafariTavernTouch(runtime, index);
  if (event?.kind === "buried_item") return interactiveSafariBuriedItem(runtime, index);
  if (event?.kind === "egg_shop") return interactiveSafariEggShop(runtime, index);
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
