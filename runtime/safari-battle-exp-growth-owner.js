import { maximumExpForGrowthRate } from "./pokemon-growth-rate.js";

function levelMovesByLevel(speciesMaster) {
  if (!Array.isArray(speciesMaster?.level_moves)) {
    throw new Error(`missing canonical level-up moves for ${speciesMaster?.id ?? "unknown species"}`);
  }
  const byLevel = Object.create(null);
  for (const entry of speciesMaster.level_moves) {
    const level = Number(entry?.level);
    const move = String(entry?.move ?? "");
    if (!Number.isInteger(level) || level < 1 || level > 100 || !move) continue;
    (byLevel[level] ??= []).push(move);
  }
  return Object.freeze(Object.fromEntries(Object.entries(byLevel).map(([level, moves]) => [level, Object.freeze([...moves])])));
}

function explicitMoveDecisions(player) {
  const decisions = player?.__battle_move_decisions;
  if (!decisions || typeof decisions !== "object" || Array.isArray(decisions)) return Object.freeze({});
  return Object.freeze(structuredClone(decisions));
}

export function resolveSafariBattleExpGrowthInput(player, defeatedFoe, playerSpeciesMaster, defeatedSpeciesMaster, trainerBattle = false) {
  if (!playerSpeciesMaster?.growth_rate) throw new Error(`missing canonical growth rate for ${player?.species ?? "unknown species"}`);
  if (!Number.isFinite(Number(defeatedSpeciesMaster?.base_exp))) throw new Error(`missing canonical base Exp for ${defeatedFoe?.species ?? "unknown species"}`);
  const growthRate = String(playerSpeciesMaster.growth_rate);
  return Object.freeze({
    growthRate,
    maximumExp: maximumExpForGrowthRate(growthRate),
    maxMoves: 4,
    expContext: Object.freeze({
      maplessExperienceRules: true,
      defeatedLevel: Number(defeatedFoe.level),
      baseExp: Number(defeatedSpeciesMaster.base_exp),
      moreExpFromTrainerPokemon: Boolean(trainerBattle),
      trainerBattle: Boolean(trainerBattle),
      scaledExpFormula: false,
    }),
    movesByLevel: levelMovesByLevel(playerSpeciesMaster),
    moveDecisions: explicitMoveDecisions(player),
  });
}
