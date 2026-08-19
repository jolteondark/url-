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

function triggeredDirectFlinch(action) {
  if (Number(action?.hpReductionResolution?.amount ?? 0) <= 0) return false;
  if (Number(action?.hpAfter ?? 0) <= 0) return false;
  return (Array.isArray(action?.secondaryEffectInputs) ? action.secondaryEffectInputs : []).some((effect) =>
    effect?.functionCode === "FlinchTarget" && effect.triggered === true
  );
}

function withTransientFlinch(action) {
  if (!action || action.kind !== "move") return action;
  const useMoveInput = action.useMoveInput ?? {};
  return {
    ...action,
    useMoveInput: {
      ...useMoveInput,
      tryUseMoveInput: {
        ...(useMoveInput.tryUseMoveInput ?? {}),
        flinch: true,
      },
    },
  };
}

function resolveRoundActionsCanonical(round) {
  const actions = (Array.isArray(round?.actions) ? round.actions : []).map((action) => structuredClone(action));
  if (actions.length === 0) return actions;
  const order = Array.isArray(round?.priorityOrder)
    ? round.priorityOrder.map(Number).filter((index) => Number.isInteger(index) && index >= 0 && index < actions.length)
    : actions.map((_, index) => index);
  const battlerActionIndex = new Map();
  actions.forEach((action, actionIndex) => {
    if (Number.isInteger(Number(action?.battlerIndex))) battlerActionIndex.set(Number(action.battlerIndex), actionIndex);
  });
  const acted = new Set();

  for (const actionIndex of order) {
    if (acted.has(actionIndex)) continue;
    const resolved = resolveCombatActionCanonical(actions[actionIndex]);
    actions[actionIndex] = resolved;
    acted.add(actionIndex);
    if (!triggeredDirectFlinch(resolved)) continue;
    const targetActionIndex = battlerActionIndex.get(Number(resolved.targetBattlerIndex));
    if (targetActionIndex === undefined || acted.has(targetActionIndex)) continue;
    actions[targetActionIndex] = withTransientFlinch(actions[targetActionIndex]);
  }
  for (let actionIndex = 0; actionIndex < actions.length; actionIndex += 1) {
    if (!acted.has(actionIndex)) actions[actionIndex] = resolveCombatActionCanonical(actions[actionIndex]);
  }
  return actions;
}

export function prepareCombatTurnInputCanonical(input = {}) {
  let seeded = input.combatRandomSeed === undefined ? input : materializeSeededAccuracyDamageCanonical(input);
  seeded = seeded.secondaryEffectRandomSeed === undefined ? seeded : materializeSeededSecondaryEffectsCanonical(seeded);
  const rounds = (Array.isArray(seeded.rounds) ? seeded.rounds : []).map((round) => ({
    ...round,
    actions: resolveRoundActionsCanonical(round),
  }));
  return { ...seeded, rounds };
}

export function resolveCombatTurnVerticalSlice(input = {}) {
  return resolveBattleLoopCanonical(prepareCombatTurnInputCanonical(input));
}
