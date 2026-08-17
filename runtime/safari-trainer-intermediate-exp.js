import { resolveExpLevelMoveFlow } from "./battle-exp-level-move-flow.js";
import { resolvePokemonRuntimeMasters } from "./pokemon-runtime-masters.js";
import {
  SAFARI_MOVE_MASTERS,
  SAFARI_NATURE_MASTERS,
  SAFARI_SPECIES_MASTERS,
} from "./safari-playable-data.js";

function moveId(move) {
  return typeof move === "string" ? move : move?.id;
}

function normalizeMoveId(id) {
  return id === "QUICK_ATTACK" ? "QUICKATTACK" : id;
}

export function awardSafariTrainerIntermediateExp(player, defeatedFoe) {
  const foeMaster = SAFARI_SPECIES_MASTERS[defeatedFoe?.species];
  const speciesMaster = SAFARI_SPECIES_MASTERS[player?.species];
  if (!foeMaster || !speciesMaster) throw new RangeError("trainer EXP species is outside the Safari projection");

  const expFlow = resolveExpLevelMoveFlow({
    pokemon: {
      exp: player.exp ?? 0,
      level: player.level,
      moves: player.moves.map(moveId),
    },
    maximumExp: 1_000_000,
    maxMoves: 4,
    expContext: {
      defeatedLevel: defeatedFoe.level,
      baseExp: foeMaster.base_exp,
      numParticipants: 1,
      expShareCount: 0,
      participant: true,
      hasExpShare: false,
      expAll: false,
      splitExpBetweenGainers: true,
      moreExpFromTrainerPokemon: true,
      trainerBattle: true,
      scaledExpFormula: false,
      outsiderMultiplier: 1,
    },
    levelThresholds: { 6: 216, 7: 343, 8: 512, 9: 729, 10: 1000 },
    movesByLevel: { 10: ["QUICKATTACK"] },
    moveDecisions: {},
  });

  const currentMoves = new Map(player.moves.map((move) => [moveId(move), move]));
  const resolvedMoves = expFlow.pokemon.moves.map((id) => {
    const canonicalId = normalizeMoveId(id);
    return currentMoves.has(canonicalId) ? structuredClone(currentMoves.get(canonicalId)) : canonicalId;
  });
  const natureId = player.nature_for_stats_id ?? player.nature_id ?? "HARDY";
  const pokemon = resolvePokemonRuntimeMasters({
    ...player,
    exp: expFlow.pokemon.exp,
    level: expFlow.pokemon.level,
    moves: resolvedMoves,
  }, {
    species_master: speciesMaster,
    nature_master: SAFARI_NATURE_MASTERS[natureId],
    move_masters: SAFARI_MOVE_MASTERS,
  });

  return {
    pokemon,
    expGained: Number(expFlow.expGained ?? 0),
    operations: expFlow.operations.map((operation) => ({ ...operation, scope: "exp" })),
  };
}
