import { resolveExpLevelMoveFlow } from "./battle-exp-level-move-flow.js";
import { updatePokemonRuntime } from "./pokemon-runtime.js";

function hasGainExpRequest(action) {
  return (action?.postHitResolution?.operations ?? []).some((entry) => entry.op === "gain_exp_request");
}

export function commitBattleSystemsExpRuntime({ battleInput = {}, turn = {}, pokemon } = {}) {
  let runtime = pokemon;
  const commits = [];
  const executed = new Set(
    (Array.isArray(turn?.operations) ? turn.operations : [])
      .filter((entry) => entry.op === "use_move")
      .map((entry) => `${Number(entry.round) - 1}:${Number(entry.action)}`),
  );

  for (const [roundIndex, round] of (Array.isArray(battleInput.rounds) ? battleInput.rounds : []).entries()) {
    for (const [actionIndex, action] of (Array.isArray(round.actions) ? round.actions : []).entries()) {
      if (!executed.has(`${roundIndex}:${actionIndex}`) || !hasGainExpRequest(action) || !action?.battleExpInput) continue;
      if (runtime?.exp == null || runtime?.level == null) throw new TypeError("pokemon exp and level are required for battle EXP reflection");
      const flow = resolveExpLevelMoveFlow({
        ...structuredClone(action.battleExpInput),
        pokemon: { exp: Number(runtime.exp), level: Number(runtime.level), moves: structuredClone(runtime.moves ?? []) },
      });
      runtime = updatePokemonRuntime(runtime, {
        exp: Number(flow.pokemon.exp),
        level: Number(flow.pokemon.level),
        moves: structuredClone(flow.pokemon.moves),
      });
      commits.push({
        roundIndex,
        actionIndex,
        result: flow.result,
        expGained: Number(flow.expGained),
        exp: Number(flow.pokemon.exp),
        level: Number(flow.pokemon.level),
        moves: structuredClone(flow.pokemon.moves),
      });
    }
  }
  return { pokemon: runtime, commits };
}

