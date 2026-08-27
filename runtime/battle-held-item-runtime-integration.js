export * from "./battle-held-item-runtime-integration-base.js";

import { commitBattleSystemsHeldItemRuntime as commitBaseHeldItemRuntime } from "./battle-held-item-runtime-integration-base.js";
import { resolveHeldItemLifecycle } from "./battle-held-item-consumption-flow.js";
import { updatePokemonRuntime } from "./pokemon-runtime.js";

function canonicalItemId(value) {
  const raw = typeof value === "string" ? value : value?.id;
  return String(raw ?? "").trim().toUpperCase();
}

function executedActionKeys(turn) {
  return new Set((turn?.operations ?? [])
    .filter((entry) => entry?.op === "use_move")
    .map((entry) => `${Number(entry.round) - 1}:${Number(entry.action)}`));
}

function commitResistBerry(runtime, request, { roundIndex, actionIndex }) {
  if (!request || canonicalItemId(runtime?.item) !== canonicalItemId(request?.item)) return { runtime, commit: null };
  const item = runtime.item ?? null;
  const flow = resolveHeldItemLifecycle({
    ...structuredClone(request),
    itemToUse: item,
    ownItem: true,
    state: { item, pokemonItem: item, initialItem: item },
  });
  const reflected = (flow.operations ?? []).some((entry) => entry?.op === "runtime_held_item_reflection");
  if (!reflected) return { runtime, commit: null };
  const next = updatePokemonRuntime(runtime, { item: flow.state?.pokemonItem ?? flow.state?.item ?? null });
  return {
    runtime: next,
    commit: {
      roundIndex,
      actionIndex,
      source: "resist_berry_action_after",
      result: flow.result,
      item: next.item ?? null,
      operations: structuredClone(flow.operations ?? []),
    },
  };
}

export function commitBattleSystemsHeldItemRuntime({ battleInput = {}, turn = {}, pokemon, reflectedBattlerIndex = null } = {}) {
  const base = commitBaseHeldItemRuntime({ battleInput, turn, pokemon, reflectedBattlerIndex });
  if (reflectedBattlerIndex === null || reflectedBattlerIndex === undefined) return base;
  let runtime = base.pokemon;
  const commits = [...(base.commits ?? [])];
  const executed = executedActionKeys(turn);
  const index = Number(reflectedBattlerIndex);
  for (const [roundIndex, round] of (battleInput.rounds ?? []).entries()) {
    const actions = Array.isArray(round?.actions) ? round.actions : [];
    const order = Array.isArray(round?.priorityOrder)
      ? round.priorityOrder.map(Number).filter((actionIndex) => Number.isInteger(actionIndex) && actionIndex >= 0 && actionIndex < actions.length)
      : actions.map((_, actionIndex) => actionIndex);
    for (const actionIndex of order) {
      if (!executed.has(`${roundIndex}:${actionIndex}`)) continue;
      const action = actions[actionIndex];
      if (Number(action?.targetBattlerIndex) !== index) continue;
      const berry = action?.abilityItemActionAfter?.targetResistBerry;
      if (berry?.triggered !== true || !berry.consumeRequest) continue;
      const committed = commitResistBerry(runtime, berry.consumeRequest, { roundIndex, actionIndex });
      runtime = committed.runtime;
      if (committed.commit) commits.push(committed.commit);
    }
  }
  return { pokemon: runtime, commits };
}
