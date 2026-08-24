import { inflictStatus, cureStatus } from "./battle-status-pp-flow.js";
import { canInflictMajorStatusCanonical } from "./battle-core-status-eligibility.js";
import { updatePokemonRuntime } from "./pokemon-runtime.js";

function hasAfterMoveRequest(action) {
  return (action?.postHitResolution?.operations ?? []).some((entry) => entry.op === "effects_after_move_request");
}

function actionDealtDamage(turn, roundIndex, actionIndex) {
  return (turn?.operations ?? []).some((entry) => {
    if (entry.op !== "reduce_hp") return false;
    if (Number(entry.round) !== Number(roundIndex) + 1 || Number(entry.action) !== Number(actionIndex)) return false;
    if (Number.isFinite(Number(entry.amount))) return Number(entry.amount) > 0;
    return Number(entry.hpAfter) < Number(entry.hpBefore);
  });
}

function resolvedInflictInput(input, action, runtime) {
  if (!input?.newStatusFromSecondaryChoice) return input;
  const secondaryIndex = Number(input.secondaryEffectTargetIndex);
  const secondary = Array.isArray(action?.secondaryEffectInputs) ? action.secondaryEffectInputs[secondaryIndex] : null;
  const newStatus = secondary?.randomChoiceValue;
  if (!newStatus) return null;
  const eligibility = canInflictMajorStatusCanonical({
    newStatus,
    currentStatus: runtime?.status ?? "NONE",
    fainted: Number(runtime?.hp ?? 0) <= 0,
    targetTypes: input.targetTypes ?? [],
    ...(input.eligibilityFacts ?? {}),
  });
  if (!eligibility.canInflict) return null;
  return { ...input, newStatus, randomStatusEligibility: eligibility };
}

export function commitBattleSystemsStatusRuntime({ battleInput = {}, turn = {}, pokemon, reflectedBattlerIndex = null } = {}) {
  let runtime = pokemon;
  const commits = [];
  const executed = new Set(
    (turn?.operations ?? [])
      .filter((entry) => entry.op === "use_move")
      .map((entry) => `${Number(entry.round) - 1}:${Number(entry.action)}`),
  );

  for (const [roundIndex, round] of (battleInput.rounds ?? []).entries()) {
    for (const [actionIndex, action] of (round.actions ?? []).entries()) {
      const rawInput = action?.battleStatusInput;
      if (!rawInput || !executed.has(`${roundIndex}:${actionIndex}`)) continue;
      if (!Boolean(rawInput.commitOnExecutedHit) && !hasAfterMoveRequest(action)) continue;
      const targetBattlerIndex = Number(rawInput.targetBattlerIndex ?? action.targetBattlerIndex);
      if (reflectedBattlerIndex !== null && reflectedBattlerIndex !== undefined && targetBattlerIndex !== Number(reflectedBattlerIndex)) continue;
      if (rawInput.requiresAccuracyHit !== false && action?.accuracyResolution?.hit !== true) continue;

      if (rawInput.secondaryEffectTargetIndex !== undefined && rawInput.secondaryEffectTargetIndex !== null) {
        const secondaryIndex = Number(rawInput.secondaryEffectTargetIndex);
        const secondary = Array.isArray(action.secondaryEffectInputs) ? action.secondaryEffectInputs[secondaryIndex] : null;
        if (!secondary?.triggered) continue;
        if (rawInput.requiresDamageDealt !== false && !actionDealtDamage(turn, roundIndex, actionIndex)) continue;
      }

      const input = resolvedInflictInput(rawInput, action, runtime);
      if (!input) continue;
      const currentState = {
        status: runtime.status ?? "NONE",
        statusCount: Number(runtime.status_count ?? 0),
        toxic: Number(input.state?.toxic ?? 0),
        outrage: Number(input.state?.outrage ?? 0),
        currentMove: input.state?.currentMove ?? null,
        truant: Boolean(input.state?.truant ?? false),
      };
      let flow;
      if (input.kind === "inflict") {
        flow = inflictStatus({ ...input, state: { ...currentState, ...(input.state ?? {}) } });
      } else if (input.kind === "cure") {
        flow = cureStatus({ ...input, state: { ...currentState, ...(input.state ?? {}) } });
      } else {
        throw new TypeError("battleStatusInput.kind must be inflict or cure");
      }
      runtime = updatePokemonRuntime(runtime, {
        status: flow.state.status,
        status_count: Number(flow.state.statusCount ?? 0),
      });
      commits.push({ roundIndex, actionIndex, kind: input.kind, targetBattlerIndex, status: runtime.status, statusCount: runtime.status_count, operations: flow.operations });
    }
  }
  return { pokemon: runtime, commits };
}
