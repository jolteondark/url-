// Compatibility adapter still consumed by safari-playable-integration-boundary.
// Boundary decisions remain owned by mapless-boundary-trial-flow; remove this
// adapter only after the Safari boundary facade no longer imports it.
import { resolveBoundaryTrialFlow } from './mapless-boundary-trial-flow.js';

function runtimeDecision(runtime) {
  const value = runtime?.battleResultHandoff?.decision;
  if (value == null) return null;
  const decision = Number(value);
  if (!Number.isInteger(decision)) throw new TypeError('Battle Runtime decision must be an integer');
  return decision;
}

export function resolveBoundaryTrialBattleHandoff(input = {}) {
  const boundaryInput = { ...(input.boundary ?? input) };
  delete boundaryInput.battleRuntime;
  delete boundaryInput.runEndPending;

  const pending = resolveBoundaryTrialFlow(boundaryInput);
  if (pending.result !== 'battle_requested') {
    return { boundary: pending, battleRuntimeDecision: null, result: pending.result };
  }

  const request = pending.battle_request;
  if (request?.kind !== 'trainer' || request?.boundary_trial !== true) {
    throw new Error('boundary trial must emit a trainer battle request');
  }
  if (!Array.isArray(request.rules) || !request.rules.includes('canLose') || !request.rules.includes('cannotRun')) {
    throw new Error('boundary trial battle rules mismatch');
  }

  const decision = runtimeDecision(input.battleRuntime);
  if (decision == null || decision === 0) {
    return { boundary: pending, battleRuntimeDecision: decision, result: 'battle_requested' };
  }

  const resolved = resolveBoundaryTrialFlow({
    ...boundaryInput,
    battle_outcome: decision,
    run_end_pending: decision !== 1 && input.runEndPending === true,
  });
  return { boundary: resolved, battleRuntimeDecision: decision, result: resolved.result };
}
