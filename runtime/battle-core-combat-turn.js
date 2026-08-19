import { resolveBattleLoopCanonical } from "./battle-core-battle-loop.js";
import { resolveAccuracyDamageVerticalCanonical } from "./battle-core-accuracy-damage-vertical.js";
import { resolveHpFaintActionCanonical } from "./battle-core-hp-faint.js";
import { tryUseMoveCanonical } from "./battle-core-try-use-move.js";
import { resolveUseMovePreflightCanonical } from "./battle-core-use-move-preflight.js";
import { resolveUseMoveTargetingCanonical } from "./battle-core-use-move-targeting.js";
import { resolveUseMoveEffectsGateCanonical } from "./battle-core-use-move-effects-gate.js";
import { resolveInitialTargetChecksCanonical } from "./battle-core-initial-target-checks.js";
import { resolveUseMoveHitLoopCanonical } from "./battle-core-use-move-hit-loop.js";
import { resolveUseMovePostHitCanonical } from "./battle-core-use-move-post-hit.js";
import { resolveUseMoveInstructCanonical } from "./battle-core-use-move-instruct.js";
import { resolveUseMoveDancerCanonical } from "./battle-core-use-move-dancer.js";
import { materializeSeededAccuracyDamageCanonical } from "./battle-core-seeded-accuracy-damage.js";
import { materializeSeededSecondaryEffectsCanonical } from "./battle-core-seeded-secondary-effect.js";
import { applyTriggeredFlinchToLaterActionCanonical } from "./battle-core-transient-flinch.js";

function resolveTryUseMoveInputCanonical(action) {
  if (action?.kind !== "move" || !action.useMoveInput?.tryUseMoveInput) return { action, resolution: null };
  const input = action.useMoveInput;
  const skipAccuracyCheck = input.tryUseMoveInput.skipAccuracyCheck === undefined
    ? Boolean((input.specialUsage ?? action.specialUsage) && !input.isStruggle)
    : Boolean(input.tryUseMoveInput.skipAccuracyCheck);
  const resolution = tryUseMoveCanonical({ ...input.tryUseMoveInput, skipAccuracyCheck });
  const prepared = structuredClone(action);
  prepared.useMoveInput = { ...prepared.useMoveInput, tryUseMoveSuccess: resolution.success };
  prepared.tryUseMoveResolution = resolution;
  if (resolution.confusionDamageResolution?.resolved) {
    prepared.hpAfter = resolution.confusionDamageResolution.hpAfter;
    prepared.hpReductionResolution = resolution.confusionDamageResolution.hpReductionResolution;
    prepared.faintResolution = resolution.confusionDamageResolution.faintResolution;
    prepared.fainted = resolution.confusionDamageResolution.fainted;
  }
  return { action: prepared, resolution };
}

function resolveCombatActionCanonical(action) {
  if (action?.kind !== "move") return action;
  const tried = resolveTryUseMoveInputCanonical(action);
  const preflighted = resolveUseMovePreflightCanonical(tried.action);
  if (tried.resolution) {
    preflighted.tryUseMoveResolution = tried.resolution;
    preflighted.lastMoveFailed = Boolean(preflighted.lastMoveFailed || tried.resolution.lastMoveFailed);
    if (tried.resolution.confusionDamageResolution?.resolved) {
      preflighted.hpAfter = tried.resolution.confusionDamageResolution.hpAfter;
      preflighted.hpReductionResolution = tried.resolution.confusionDamageResolution.hpReductionResolution;
      preflighted.faintResolution = tried.resolution.confusionDamageResolution.faintResolution;
      preflighted.fainted = tried.resolution.confusionDamageResolution.fainted;
    }
  }
  if (preflighted.moveSkipped) return preflighted;
  const targeted = resolveUseMoveTargetingCanonical(preflighted);
  const effectsGated = resolveUseMoveEffectsGateCanonical(targeted);
  if (effectsGated.moveSkipped) return effectsGated;
  const targetChecked = resolveInitialTargetChecksCanonical(effectsGated);
  const hitLooped = resolveUseMoveHitLoopCanonical(targetChecked);
  const hpResolved = resolveHpFaintActionCanonical(resolveAccuracyDamageVerticalCanonical(hitLooped));
  const postHitResolved = resolveUseMovePostHitCanonical(hpResolved);
  const instructed = resolveUseMoveInstructCanonical(postHitResolved);
  if (instructed.instructResolution?.terminated) return instructed;
  return resolveUseMoveDancerCanonical(instructed);
}

function resolveCombatRoundCanonical(round = {}) {
  const actions = structuredClone(Array.isArray(round.actions) ? round.actions : []);
  const requestedOrder = Array.isArray(round.priorityOrder)
    ? round.priorityOrder.map(Number).filter((index) => Number.isInteger(index) && index >= 0 && index < actions.length)
    : actions.map((_, index) => index);
  const order = [...new Set([...requestedOrder, ...actions.map((_, index) => index)])];

  for (let orderIndex = 0; orderIndex < order.length; orderIndex += 1) {
    const actionIndex = order[orderIndex];
    const resolved = resolveCombatActionCanonical(actions[actionIndex]);
    actions[actionIndex] = resolved;
    if (!resolved || resolved.kind !== "move") continue;

    for (let laterIndex = orderIndex + 1; laterIndex < order.length; laterIndex += 1) {
      const targetActionIndex = order[laterIndex];
      const targetAction = actions[targetActionIndex];
      if (!targetAction || Number(targetAction.battlerIndex) !== Number(resolved.targetBattlerIndex)) continue;
      const flinch = applyTriggeredFlinchToLaterActionCanonical({ sourceAction: resolved, targetAction });
      if (flinch.applied) actions[targetActionIndex] = flinch.action;
      break;
    }
  }
  return { ...round, actions };
}

export function prepareCombatTurnInputCanonical(input = {}) {
  let seeded = input.combatRandomSeed === undefined ? input : materializeSeededAccuracyDamageCanonical(input);
  seeded = seeded.secondaryEffectRandomSeed === undefined ? seeded : materializeSeededSecondaryEffectsCanonical(seeded);
  const rounds = (Array.isArray(seeded.rounds) ? seeded.rounds : []).map(resolveCombatRoundCanonical);
  return { ...seeded, rounds };
}

export function resolveCombatTurnVerticalSlice(input = {}) {
  return resolveBattleLoopCanonical(prepareCombatTurnInputCanonical(input));
}
