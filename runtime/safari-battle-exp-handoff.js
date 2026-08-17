import { resolveExpLevelMoveFlow } from "./battle-exp-level-move-flow.js";
import { resolvePokemonRuntimeMasters } from "./pokemon-runtime-masters.js";
import {
  SAFARI_MOVE_MASTERS,
  SAFARI_NATURE_MASTERS,
  SAFARI_SPECIES_MASTERS,
  SAFARI_ZERO_STAT_VALUES,
} from "./safari-playable-data.js";

function moveId(move) {
  return typeof move === "string" ? move : move?.id;
}

function normalizeMoveId(id) {
  return id === "QUICK_ATTACK" ? "QUICKATTACK" : id;
}

function requirePartyIndex(runtime, partyIndex) {
  const party = runtime?.player?.party;
  if (!Array.isArray(party)) throw new TypeError("runtime player party is required");
  const index = Number(partyIndex);
  if (!Number.isInteger(index) || index < 0 || index >= party.length) {
    throw new RangeError("player party index is outside the active party");
  }
  return index;
}

function rematerializePokemon(player, expFlow) {
  const speciesMaster = SAFARI_SPECIES_MASTERS[player?.species];
  if (!speciesMaster) throw new RangeError(`species is outside the Safari projection: ${player?.species}`);
  const natureId = player.nature_for_stats_id ?? player.nature_id ?? "HARDY";
  const currentMoves = new Map((player.moves ?? []).map((move) => [normalizeMoveId(moveId(move)), move]));
  const moves = expFlow.pokemon.moves.map((id) => {
    const canonicalId = normalizeMoveId(id);
    return currentMoves.has(canonicalId)
      ? structuredClone(currentMoves.get(canonicalId))
      : canonicalId;
  });
  return resolvePokemonRuntimeMasters({
    ...player,
    exp: expFlow.pokemon.exp,
    level: expFlow.pokemon.level,
    nature_id: player.nature_id ?? natureId,
    iv: player.iv ?? { ...SAFARI_ZERO_STAT_VALUES },
    ev: player.ev ?? { ...SAFARI_ZERO_STAT_VALUES },
    moves,
  }, {
    species_master: speciesMaster,
    nature_master: SAFARI_NATURE_MASTERS[natureId],
    move_masters: SAFARI_MOVE_MASTERS,
  });
}

export function awardSafariTrainerFaintExp(runtime, battle, defeatedFoe, playerPartyIndex = 0) {
  if (!battle || battle.kind !== "trainer") {
    return { applied: false, expGained: 0, operations: [] };
  }
  const index = requirePartyIndex(runtime, playerPartyIndex);
  const player = runtime.player.party[index];
  const foeMaster = SAFARI_SPECIES_MASTERS[defeatedFoe?.species];
  if (!foeMaster) throw new RangeError(`defeated trainer species is outside the Safari projection: ${defeatedFoe?.species}`);
  const expFlow = resolveExpLevelMoveFlow({
    pokemon: {
      exp: player.exp ?? 0,
      level: player.level,
      moves: (player.moves ?? []).map(moveId),
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
  runtime.player.party[index] = rematerializePokemon(player, expFlow);
  battle.exp_gained = Number(battle.exp_gained ?? 0) + Number(expFlow.expGained ?? 0);
  return {
    applied: true,
    playerPartyIndex: index,
    expGained: Number(expFlow.expGained ?? 0),
    pokemon: structuredClone(runtime.player.party[index]),
    operations: expFlow.operations.map((operation) => ({ ...operation, scope: "exp" })),
  };
}
