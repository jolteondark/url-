import { resolveLeavingBattleStateReflection } from "./battle-leaving-state-reflection.js";
import { createPokemonRuntime, updatePokemonRuntime } from "./pokemon-runtime.js";

export function applyPostBattleReflection(runtimeInput, eventInput) {
  const runtime = createPokemonRuntime(runtimeInput);
  if (!eventInput || typeof eventInput !== "object") throw new TypeError("reflection event is required");
  const reflected = resolveLeavingBattleStateReflection({
    ...eventInput,
    name: runtime.species,
    form: runtime.form,
    moves: runtime.moves,
  });
  const runtimeAfter = updatePokemonRuntime(runtime, {
    form: reflected.form,
    moves: reflected.moves,
  });
  return {
    runtime: runtimeAfter,
    operations: reflected.operations,
  };
}

