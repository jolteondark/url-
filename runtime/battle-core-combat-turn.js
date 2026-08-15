import { resolveGenericTurnVerticalSlice } from "./battle-core-turn-vertical-slice.js";
import { resolveAccuracyDamageActionCanonical } from "./battle-core-accuracy-damage.js";
import { resolveHpFaintActionCanonical } from "./battle-core-hp-faint.js";
import { resolveUseMovePreflightCanonical } from "./battle-core-use-move-preflight.js";
import { resolveUseMoveTargetingCanonical } from "./battle-core-use-move-targeting.js";
import { resolveUseMoveEffectsGateCanonical } from "./battle-core-use-move-effects-gate.js";
import { resolveInitialTargetChecksCanonical } from "./battle-core-initial-target-checks.js";
import { resolveUseMoveHitLoopCanonical } from "./battle-core-use-move-hit-loop.js";
import { resolveUseMovePostHitCanonical } from "./battle-core-use-move-post-hit.js";
import { resolveUseMoveInstructCanonical } from "./battle-core-use-move-instruct.js";
import { resolveUseMoveDancerCanonical } from "./battle-core-use-move-dancer.js";

function resolveCombatActionCanonical(action) {
  if (action?.kind !== "move") return action;
  const preflighted = resolveUseMovePreflightCanonical(action);
  if (preflighted.moveSkipped) return preflighted;
  const targeted = resolveUseMoveTargetingCanonical(preflighted);
  const effectsGated = resolveUseMoveEffectsGateCanonical(targeted);
  if (effectsGated.moveSkipped) return effectsGated;
  const targetChecked = resolveInitialTargetChecksCanonical(effectsGated);
  const hitLooped = resolveUseMoveHitLoopCanonical(targetChecked);
  const hpResolved = resolveHpFaintActionCanonical(resolveAccuracyDamageActionCanonical(hitLooped));
  const postHitResolved = resolveUseMovePostHitCanonical(hpResolved);
  const instructed = resolveUseMoveInstructCanonical(postHitResolved);
  if (instructed.instructResolution?.terminated) return instructed;
  return resolveUseMoveDancerCanonical(instructed);
}

export function prepareCombatTurnInputCanonical(input = {}) {
  const rounds = (Array.isArray(input.rounds) ? input.rounds : []).map((round) => ({
    ...round,
    actions: (Array.isArray(round.actions) ? round.actions : []).map(resolveCombatActionCanonical),
  }));
  return { ...input, rounds };
}

export function resolveCombatTurnVerticalSlice(input = {}) {
  return resolveGenericTurnVerticalSlice(prepareCombatTurnInputCanonical(input));
}
