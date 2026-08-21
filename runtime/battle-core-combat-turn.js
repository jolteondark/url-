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
import { resolveBattleAbilityItemHookCanonical } from "./battle-ability-item-hook-dispatch.js";
import { resolveFocusBandSurvivalCanonical } from "./battle-core-focus-band-survival-extension.js";
import {
  applyBattleStatStageChangesCanonical,
  battleStatStageEffectSucceededCanonical,
  createBattleStatStageStateCanonical,
  injectBattleStatStagesIntoActionCanonical,
} from "./battle-core-stat-stages.js";

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

export function applyBattleAbilityItemSurvivalCanonical(action) {
  const prepared = structuredClone(action);
  if (
    prepared?.kind !== "move" ||
    prepared.moveSkipped === true ||
    prepared.lastMoveFailed === true ||
    !prepared.abilityItemActionBefore ||
    Number(prepared.calculatedDamage ?? 0) <= 0
  ) {
    return prepared;
  }

  const modifiers = prepared.abilityItemActionBefore?.modifiers ?? {};
  const target = {
    ability: modifiers.targetAbility ?? "NONE",
    held_item: modifiers.targetItem ?? null,
    hp: Number(prepared.hpBefore ?? 0),
    max_hp: Number(prepared.totalHp ?? 0),
  };
  const baseSurvival = resolveBattleAbilityItemHookCanonical({
    hook: "survival",
    target,
    incomingDamage: Number(prepared.calculatedDamage ?? 0),
    moldBreaker: Boolean(modifiers.moldBreaker),
  });
  const survival = baseSurvival?.triggered === true
    ? baseSurvival
    : resolveFocusBandSurvivalCanonical({
      target,
      incomingDamage: Number(prepared.calculatedDamage ?? 0),
      randomRoll: prepared.abilityItemSurvivalRandomRoll,
    });
  prepared.abilityItemSurvival = survival;
  if (survival?.triggered === true) prepared.calculatedDamage = Number(survival.damage ?? prepared.calculatedDamage);
  return prepared;
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
  const damageResolved = resolveAccuracyDamageVerticalCanonical(hitLooped);
  const survived = applyBattleAbilityItemSurvivalCanonical(damageResolved);
  const hpResolved = resolveHpFaintActionCanonical(survived);
  const postHitResolved = resolveUseMovePostHitCanonical(hpResolved);
  const instructed = resolveUseMoveInstructCanonical(postHitResolved);
  if (instructed.instructResolution?.terminated) return instructed;
  return resolveUseMoveDancerCanonical(instructed);
}

function actionAfterSourcePokemonCanonical(prepared, side) {
  const modifiers = prepared?.abilityItemActionBefore?.modifiers ?? {};
  if (side === "user") {
    return {
      ability: modifiers.userAbility ?? "NONE",
      held_item: modifiers.userItem ?? null,
      hp: Number(prepared.actorHpBefore ?? 0),
      max_hp: Number(prepared.actorTotalHp ?? 0),
      status: prepared?.hpFunctionInput?.actorStatus ?? "NONE",
      stats: structuredClone(prepared.actorStats ?? prepared.userPokemon?.stats ?? {}),
    };
  }
  return {
    ability: modifiers.targetAbility ?? prepared?.abilityItemTypeImmunityResolution?.targetAbility ?? "NONE",
    held_item: modifiers.targetItem ?? null,
    hp: Number(prepared.hpAfter ?? prepared.hpBefore ?? 0),
    max_hp: Number(prepared.totalHp ?? 0),
    status: "NONE",
    stats: structuredClone(prepared.targetStats ?? prepared.targetPokemon?.stats ?? {}),
  };
}

function actionAfterMoveCanonical(prepared) {
  const secondary = Array.isArray(prepared?.secondaryEffectInputs) ? prepared.secondaryEffectInputs : [];
  const effectChance = secondary.reduce((maximum, effect) => Math.max(maximum, Number(effect?.effectChance ?? effect?.chance ?? 0)), 0);
  return {
    id: prepared.moveId ?? null,
    type: prepared?.damageInput?.damageMultiplierInput?.type ?? null,
    category: prepared.moveCategory ?? null,
    function_code: prepared.functionCode ?? null,
    effect_chance: effectChance,
  };
}

export function applyBattleAbilityItemActionAfterCanonical(action, inputStatStages = null) {
  const statStages = createBattleStatStageStateCanonical(inputStatStages);
  const prepared = structuredClone(action);
  if (
    prepared?.kind !== "move" ||
    prepared.moveSkipped === true ||
    prepared.lastMoveFailed === true ||
    !prepared.abilityItemActionBefore
  ) {
    return { action: prepared, statStages };
  }

  const actionAfter = resolveBattleAbilityItemHookCanonical({
    hook: "action_after",
    user: actionAfterSourcePokemonCanonical(prepared, "user"),
    target: actionAfterSourcePokemonCanonical(prepared, "target"),
    move: actionAfterMoveCanonical(prepared),
    damageDealt: Number(prepared.hpReductionResolution?.amount ?? 0),
    context: {
      typeImmunityResolution: structuredClone(prepared.abilityItemTypeImmunityResolution ?? null),
      typeMod: Number(prepared?.typeEffectivenessResolution?.multiplier ?? 1),
      targetFainted: Boolean(prepared.fainted ?? prepared.faintResolution?.fainted ?? Number(prepared.hpAfter ?? 1) <= 0),
      targetStatStages: structuredClone(statStages?.[Number(prepared.targetBattlerIndex)] ?? {}),
    },
  });
  prepared.abilityItemActionAfter = actionAfter;

  const changes = [
    ...(actionAfter?.typeImmunityAfterEffect?.statChanges ?? []),
    ...(actionAfter?.targetHitReactiveItem?.statChanges ?? []),
    ...(actionAfter?.koBoost?.statChanges ?? []),
  ];
  if (changes.length === 0) return { action: prepared, statStages };
  const stageResolution = applyBattleStatStageChangesCanonical(
    statStages,
    changes,
    prepared.battlerIndex,
    prepared.targetBattlerIndex,
  );
  prepared.abilityItemActionAfterStatStageResolution = stageResolution;
  return { action: prepared, statStages: stageResolution.state };
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

function applyResolvedActionStagesCanonical(resolvedAction, inputStatStages) {
  let statStages = inputStatStages;
  const resolved = resolvedAction;
  if (battleStatStageEffectSucceededCanonical(resolved)) {
    const stageResolution = applyBattleStatStageChangesCanonical(
      statStages,
      resolved.statStageEffectInput.changes,
      resolved.battlerIndex,
      resolved.targetBattlerIndex,
    );
    statStages = stageResolution.state;
    resolved.statStageResolution = stageResolution;
  }
  const actionAfter = applyBattleAbilityItemActionAfterCanonical(resolved, statStages);
  return { action: actionAfter.action, statStages: actionAfter.statStages };
}

function resolveRoundActionsCanonical(round) {
  const actions = (Array.isArray(round?.actions) ? round.actions : []).map((action) => structuredClone(action));
  let statStages = createBattleStatStageStateCanonical(round?.statStages);
  if (actions.length === 0) return { actions, statStages };
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
    const staged = injectBattleStatStagesIntoActionCanonical(actions[actionIndex], statStages);
    const resolved = applyResolvedActionStagesCanonical(resolveCombatActionCanonical(staged), statStages);
    statStages = resolved.statStages;
    actions[actionIndex] = resolved.action;
    acted.add(actionIndex);
    if (!triggeredDirectFlinch(resolved.action)) continue;
    const targetActionIndex = battlerActionIndex.get(Number(resolved.action.targetBattlerIndex));
    if (targetActionIndex === undefined || acted.has(targetActionIndex)) continue;
    actions[targetActionIndex] = withTransientFlinch(actions[targetActionIndex]);
  }
  for (let actionIndex = 0; actionIndex < actions.length; actionIndex += 1) {
    if (acted.has(actionIndex)) continue;
    const staged = injectBattleStatStagesIntoActionCanonical(actions[actionIndex], statStages);
    const resolved = applyResolvedActionStagesCanonical(resolveCombatActionCanonical(staged), statStages);
    statStages = resolved.statStages;
    actions[actionIndex] = resolved.action;
  }
  return { actions, statStages };
}

export function prepareCombatTurnInputCanonical(input = {}) {
  let seeded = input.combatRandomSeed === undefined ? input : materializeSeededAccuracyDamageCanonical(input);
  seeded = seeded.secondaryEffectRandomSeed === undefined ? seeded : materializeSeededSecondaryEffectsCanonical(seeded);
  const rounds = (Array.isArray(seeded.rounds) ? seeded.rounds : []).map((round) => {
    const resolved = resolveRoundActionsCanonical(round);
    return { ...round, actions: resolved.actions, statStages: resolved.statStages };
  });
  return { ...seeded, rounds };
}

export function resolveCombatTurnVerticalSlice(input = {}) {
  return resolveBattleLoopCanonical(prepareCombatTurnInputCanonical(input));
}
