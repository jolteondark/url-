import * as playable from "./safari-playable-integration.js";
import { generateSafariDynamicTrainer } from "./mapless-dynamic-trainer-generator.js";
import { resolvePokemonRuntimeMasters } from "./pokemon-runtime-masters.js";
import { resolveBattleStartCore } from "./battle-core-start-handoff.js";
import {
  SAFARI_MOVE_MASTERS,
  SAFARI_NATURE_MASTERS,
  SAFARI_SPECIES_MASTERS,
  SAFARI_ZERO_STAT_VALUES,
} from "./safari-playable-data.js";

export * from "./safari-playable-integration.js";

function materializeTrainerPokemon(input) {
  const speciesMaster = SAFARI_SPECIES_MASTERS[input.species];
  if (!speciesMaster) throw new RangeError(`species is outside the Safari projection: ${input.species}`);
  const moves = input.move_ids.filter((id) => SAFARI_MOVE_MASTERS[id]);
  if (moves.length === 0) throw new RangeError(`trainer moves are outside the Safari projection: ${input.species}`);
  return resolvePokemonRuntimeMasters({
    species: input.species,
    level: input.level,
    hp: 1,
    nature_id: "HARDY",
    iv: { ...SAFARI_ZERO_STAT_VALUES },
    ev: { ...SAFARI_ZERO_STAT_VALUES },
    status: "NONE",
    moves,
  }, {
    species_master: speciesMaster,
    nature_master: SAFARI_NATURE_MASTERS.HARDY,
    move_masters: SAFARI_MOVE_MASTERS,
  });
}

export function activateSafariDayBoardCell(runtime, index) {
  const state = runtime?.variables?.mapless;
  const event = state?.board_events?.[index];
  if (!event || event.kind !== "trainer") return playable.activateSafariDayBoardCell(runtime, index);

  const result = playable.activateSafariDayBoardCell(runtime, index);
  if (result.result !== "dispatched" || !state.battle || state.battle.kind !== "trainer") return result;

  // Current browser battle loop is single-opponent. Generate the canonical trainer
  // through the shared generator, then project its lead into that existing loop.
  // The generator itself remains 1-2 party capable; multi-opponent handoff is kept
  // explicit in trainer.party for the next battle-loop slice.
  const trainer = generateSafariDynamicTrainer({ day: state.day });
  const materializedParty = trainer.party.map(materializeTrainerPokemon);
  const opponent = materializedParty[0];
  const battleStart = resolveBattleStartCore({ sendOuts: [[0, runtime.player.party[0]], [1, opponent]] });
  state.battle.foe = opponent;
  state.battle.trainer = trainer;
  state.battle.trainer_party = materializedParty;
  state.battle.trainer_party_index = 0;
  state.battle.prize_money = trainer.prize_money;
  state.battle.skill_level = trainer.skill_level;
  state.battle.last_operations = [...(state.battle.last_operations ?? []), ...battleStart.operations];
  state.battle.presentation = [{ type: "battle_started", actor: "foe", species: opponent.species, trainer: trainer.trainer_full_name }];
  state.notice = `${trainer.trainer_full_name}が勝負を仕掛けてきた！`;
  state.last_operations = state.battle.last_operations;
  return { ...result, notice: state.notice, operations: state.battle.last_operations, presentation: state.battle.presentation, trainer };
}
