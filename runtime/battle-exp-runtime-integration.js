import { resolveExpLevelMoveFlow } from "./battle-exp-level-move-flow.js";
import { resolvePokemonRuntimeMasters } from "./pokemon-runtime-masters.js";
import { updatePokemonRuntime } from "./pokemon-runtime.js";

function hasGainExpRequest(action) {
  return (action?.postHitResolution?.operations ?? []).some((entry) => entry.op === "gain_exp_request");
}

function moveId(move) {
  return typeof move === "string" ? move : move?.id;
}

function reflectedMoves(runtime, moveIds) {
  const existing = new Map((runtime?.moves ?? []).map((move) => [moveId(move), move]));
  return (moveIds ?? []).map((id) => existing.has(id) ? structuredClone(existing.get(id)) : id);
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
        pokemon: { exp: Number(runtime.exp), level: Number(runtime.level), moves: (runtime.moves ?? []).map(moveId) },
      });
      const moves = reflectedMoves(runtime, flow.pokemon.moves);
      const runtimeMasters = action.battleExpInput.runtimeMasters ?? null;
      runtime = runtimeMasters
        ? resolvePokemonRuntimeMasters({ ...runtime, exp: Number(flow.pokemon.exp), level: Number(flow.pokemon.level), moves }, structuredClone(runtimeMasters))
        : updatePokemonRuntime(runtime, {
          exp: Number(flow.pokemon.exp),
          level: Number(flow.pokemon.level),
          moves,
        });
      commits.push({
        roundIndex,
        actionIndex,
        result: flow.result,
        expGained: Number(flow.expGained),
        exp: Number(flow.pokemon.exp),
        level: Number(flow.pokemon.level),
        moves: structuredClone(runtime.moves),
        operations: structuredClone(flow.operations ?? []),
      });
    }
  }
  return { pokemon: runtime, commits };
}
