import { resolveHeldItemLifecycle } from "./battle-held-item-consumption-flow.js";
import { updatePokemonRuntime } from "./pokemon-runtime.js";

function hasAfterMoveRequest(action) {
  return (action?.postHitResolution?.operations ?? []).some((entry) => entry?.op === "effects_after_move_request");
}

export function commitBattleSystemsHeldItemRuntime({ battleInput = {}, turn = {}, pokemon } = {}) {
  let runtime = updatePokemonRuntime(pokemon, {});
  const commits = [];
  const executed = new Set((turn.operations ?? [])
    .filter((entry) => entry?.op === "use_move")
    .map((entry) => `${Number(entry.round) - 1}:${Number(entry.action)}`));

  for (const [roundIndex, round] of (battleInput.rounds ?? []).entries()) {
    for (const [actionIndex, action] of (round.actions ?? []).entries()) {
      if (!executed.has(`${roundIndex}:${actionIndex}`) || !hasAfterMoveRequest(action) || !action?.battleHeldItemInput) continue;
      const input = structuredClone(action.battleHeldItemInput);
      input.state = { ...(input.state ?? {}) };
      if (!Object.prototype.hasOwnProperty.call(input.state, "item")) input.state.item = runtime.item ?? null;
      if (!Object.prototype.hasOwnProperty.call(input.state, "pokemonItem")) input.state.pokemonItem = runtime.item ?? null;
      if (!Object.prototype.hasOwnProperty.call(input.state, "initialItem")) input.state.initialItem = runtime.item ?? null;
      const flow = resolveHeldItemLifecycle(input);
      const reflected = (flow.operations ?? []).some((entry) => entry?.op === "runtime_held_item_reflection");
      if (!reflected) continue;
      runtime = updatePokemonRuntime(runtime, { item: flow.state?.pokemonItem ?? flow.state?.item ?? null });
      commits.push({
        roundIndex,
        actionIndex,
        result: flow.result,
        item: runtime.item ?? null,
        operations: structuredClone(flow.operations ?? []),
      });
    }
  }
  return { pokemon: runtime, commits };
}

