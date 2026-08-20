import { resolveHeldItemLifecycle } from "./battle-held-item-consumption-flow.js";
import { updatePokemonRuntime } from "./pokemon-runtime.js";

function hasAfterMoveRequest(action) {
  return (action?.postHitResolution?.operations ?? []).some((entry) => entry?.op === "effects_after_move_request");
}

function canonicalItemId(value) {
  const raw = typeof value === "string" ? value : value?.id;
  return String(raw ?? "").toUpperCase();
}

function actionAfterConsumeRequests(action, reflectedBattlerIndex) {
  const after = action?.abilityItemActionAfter;
  if (!after || reflectedBattlerIndex === null || reflectedBattlerIndex === undefined) return [];
  const index = Number(reflectedBattlerIndex);
  const requests = [];
  if (Number(action?.targetBattlerIndex) === index) {
    if (after?.targetBerry?.triggered === true && after.targetBerry.consumeRequest) requests.push(after.targetBerry.consumeRequest);
    if (after?.targetAirBalloon?.triggered === true && after.targetAirBalloon.consumeRequest) requests.push(after.targetAirBalloon.consumeRequest);
  }
  return requests;
}

function commitConsumeRequest(runtime, request, { roundIndex, actionIndex, source }) {
  if (!request || canonicalItemId(runtime?.item) !== canonicalItemId(request?.item)) return { runtime, commit: null };
  const item = runtime.item ?? null;
  const input = {
    ...structuredClone(request),
    itemToUse: item,
    ownItem: true,
    state: { item, pokemonItem: item, initialItem: item },
  };
  const flow = resolveHeldItemLifecycle(input);
  const reflected = (flow.operations ?? []).some((entry) => entry?.op === "runtime_held_item_reflection");
  if (!reflected) return { runtime, commit: null };
  const next = updatePokemonRuntime(runtime, { item: flow.state?.pokemonItem ?? flow.state?.item ?? null });
  return {
    runtime: next,
    commit: {
      roundIndex,
      actionIndex,
      source,
      result: flow.result,
      item: next.item ?? null,
      operations: structuredClone(flow.operations ?? []),
    },
  };
}

export function commitBattleSystemsHeldItemRuntime({ battleInput = {}, turn = {}, pokemon, reflectedBattlerIndex = null } = {}) {
  let runtime = updatePokemonRuntime(pokemon, {});
  const commits = [];
  const executed = new Set((turn.operations ?? [])
    .filter((entry) => entry?.op === "use_move")
    .map((entry) => `${Number(entry.round) - 1}:${Number(entry.action)}`));

  for (const [roundIndex, round] of (battleInput.rounds ?? []).entries()) {
    const actions = Array.isArray(round.actions) ? round.actions : [];
    const order = Array.isArray(round.priorityOrder)
      ? round.priorityOrder.map(Number).filter((actionIndex) => Number.isInteger(actionIndex) && actionIndex >= 0 && actionIndex < actions.length)
      : actions.map((_, actionIndex) => actionIndex);
    for (const actionIndex of order) {
      const action = actions[actionIndex];
      if (!executed.has(`${roundIndex}:${actionIndex}`)) continue;

      if (hasAfterMoveRequest(action) && action?.battleHeldItemInput) {
        const input = structuredClone(action.battleHeldItemInput);
        input.state = { ...(input.state ?? {}) };
        if (!Object.prototype.hasOwnProperty.call(input.state, "item")) input.state.item = runtime.item ?? null;
        if (!Object.prototype.hasOwnProperty.call(input.state, "pokemonItem")) input.state.pokemonItem = runtime.item ?? null;
        if (!Object.prototype.hasOwnProperty.call(input.state, "initialItem")) input.state.initialItem = runtime.item ?? null;
        const flow = resolveHeldItemLifecycle(input);
        const reflected = (flow.operations ?? []).some((entry) => entry?.op === "runtime_held_item_reflection");
        if (reflected) {
          runtime = updatePokemonRuntime(runtime, { item: flow.state?.pokemonItem ?? flow.state?.item ?? null });
          commits.push({
            roundIndex,
            actionIndex,
            source: "battle_held_item_input",
            result: flow.result,
            item: runtime.item ?? null,
            operations: structuredClone(flow.operations ?? []),
          });
        }
      }

      for (const request of actionAfterConsumeRequests(action, reflectedBattlerIndex)) {
        const committed = commitConsumeRequest(runtime, request, {
          roundIndex,
          actionIndex,
          source: "shared_action_after",
        });
        runtime = committed.runtime;
        if (committed.commit) commits.push(committed.commit);
      }
    }
  }
  return { pokemon: runtime, commits };
}
