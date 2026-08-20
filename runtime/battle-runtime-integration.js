import { updatePokemonRuntime } from "./pokemon-runtime.js";
import { resolveBattleStartCore } from "./battle-core-start-handoff.js";
import { resolveGenericTurnVerticalSlice } from "./battle-core-turn-vertical-slice.js";
import { resolveBattleLoopCanonical } from "./battle-core-battle-loop.js";
import { resolveAttackPhaseCanonical } from "./battle-core-attack-phase.js";
import { resolveAttackPhaseMovesCanonical, resolvePlayableMoveRoundCanonical } from "./battle-core-attack-phase-moves.js";
import { prepareCombatTurnInputCanonical } from "./battle-core-combat-turn.js";
import { resolvePostBattlePersistence } from "./battle-post-battle-persistence-flow.js";
import { prepareBattleSystemsPpRuntime, commitBattleSystemsPpRuntime } from "./battle-move-pp-integration.js";
import { commitBattleSystemsExpRuntime } from "./battle-exp-runtime-integration.js";
import { commitBattleSystemsStatusRuntime } from "./battle-status-runtime-integration.js";
import { commitBattleSystemsHeldItemRuntime } from "./battle-held-item-runtime-integration.js";
import { prepareReflectedMajorStatusBattleInput } from "./battle-major-status-runtime-preparation.js";

export function reflectBattleCoreHpToPokemonRuntime(runtime, turnResult, actionIndex) {
  const operations = Array.isArray(turnResult?.operations) ? turnResult.operations : [];
  const matches = operations.filter((entry) => entry.op === "reduce_hp" && Number(entry.action) === Number(actionIndex));
  if (matches.length === 0) return updatePokemonRuntime(runtime, {});
  return updatePokemonRuntime(runtime, { hp: Number(matches.at(-1).hpAfter) });
}

export function reflectBattleCoreBattlerHpToPokemonRuntime(runtime, turnResult, battlerIndex, fallbackActionIndex = null) {
  const operations = Array.isArray(turnResult?.operations) ? turnResult.operations : [];
  const index = Number(battlerIndex);
  const matches = operations.filter((entry) =>
    (entry.op === "reduce_hp" && Number(entry.targetBattlerIndex) === index) ||
    (entry.op === "reduce_self_hp" && Number(entry.battlerIndex) === index)
  );
  if (matches.length > 0) return updatePokemonRuntime(runtime, { hp: Number(matches.at(-1).hpAfter) });
  if (fallbackActionIndex !== null && fallbackActionIndex !== undefined) {
    return reflectBattleCoreHpToPokemonRuntime(runtime, turnResult, fallbackActionIndex);
  }
  return updatePokemonRuntime(runtime, {});
}

export function reflectBattleCoreTryUseMoveHpToPokemonRuntime(runtime, preparedBattleInput, actionIndex) {
  const rounds = Array.isArray(preparedBattleInput?.rounds) ? preparedBattleInput.rounds : [];
  const matches = [];
  for (const round of rounds) {
    const action = Array.isArray(round?.actions) ? round.actions[Number(actionIndex)] : null;
    const confusion = action?.tryUseMoveResolution?.confusionDamageResolution;
    if (confusion?.resolved && confusion.hpAfter !== undefined) matches.push(confusion);
  }
  if (matches.length === 0) return updatePokemonRuntime(runtime, {});
  return updatePokemonRuntime(runtime, { hp: Number(matches.at(-1).hpAfter) });
}

function actionAfterHpDeltaForBattler(action, battlerIndex) {
  const after = action?.abilityItemActionAfter;
  if (!after) return 0;
  const index = Number(battlerIndex);
  let delta = 0;
  if (Number(action?.battlerIndex) === index) {
    delta += Number(after.userHpDelta ?? 0);
    delta += Number(after?.contactReactive?.userHpDelta ?? 0);
  }
  if (Number(action?.targetBattlerIndex) === index) {
    const immunity = after?.typeImmunityAfterEffect;
    if (immunity?.triggered === true) delta += Number(immunity.hpDelta ?? 0);
    const berry = after?.targetBerry;
    if (berry?.triggered === true) delta += Number(berry.heal ?? 0);
  }
  return Number.isFinite(delta) ? Math.trunc(delta) : 0;
}

export function reflectBattleCoreAbilityItemActionAfterHpToPokemonRuntime(runtime, preparedBattleInput, battlerIndex) {
  const rounds = Array.isArray(preparedBattleInput?.rounds) ? preparedBattleInput.rounds : [];
  const index = Number(battlerIndex);
  let hp = Number(runtime?.hp ?? 0);
  const maxHp = Math.max(0, Number(runtime?.max_hp ?? runtime?.maxHp ?? hp));
  let changed = false;
  for (const round of rounds) {
    const actions = Array.isArray(round?.actions) ? round.actions : [];
    const order = Array.isArray(round?.priorityOrder)
      ? round.priorityOrder.map(Number).filter((actionIndex) => Number.isInteger(actionIndex) && actionIndex >= 0 && actionIndex < actions.length)
      : actions.map((_, actionIndex) => actionIndex);
    for (const actionIndex of order) {
      const delta = actionAfterHpDeltaForBattler(actions[actionIndex], index);
      if (delta === 0) continue;
      if (hp <= 0 && delta > 0) continue;
      hp = Math.min(maxHp, Math.max(0, hp + delta));
      changed = true;
    }
  }
  return changed ? updatePokemonRuntime(runtime, { hp }) : updatePokemonRuntime(runtime, {});
}

export function reflectBattleCoreTryUseMoveStatusToPokemonRuntime(runtime, preparedBattleInput, actionIndex) {
  const rounds = Array.isArray(preparedBattleInput?.rounds) ? preparedBattleInput.rounds : [];
  let reflected = updatePokemonRuntime(runtime, {});
  let changed = false;
  for (const round of rounds) {
    const action = Array.isArray(round?.actions) ? round.actions[Number(actionIndex)] : null;
    const input = action?.useMoveInput?.tryUseMoveInput;
    const resolution = action?.tryUseMoveResolution;
    if (!input || !resolution) continue;
    const status = String(input.status ?? "NONE").toUpperCase();
    const cured = (resolution.operations ?? []).some((op) => op.op === "cure_status_request" && String(op.status ?? "").toUpperCase() === status);
    if (status === "SLEEP") {
      reflected = updatePokemonRuntime(reflected, cured
        ? { status: "NONE", status_count: 0 }
        : { status_count: Number(resolution.statusCount ?? reflected.status_count ?? 0) });
      changed = true;
    } else if (status === "FROZEN" && cured) {
      reflected = updatePokemonRuntime(reflected, { status: "NONE", status_count: 0 });
      changed = true;
    }
  }
  return { pokemon: reflected, changed };
}

function restrictPpReflectionToActions(battleInput, actionIndexes) {
  if (actionIndexes == null) return battleInput;
  const allowed = new Set(actionIndexes.map(Number));
  const prepared = structuredClone(battleInput ?? {});
  prepared.rounds = (Array.isArray(prepared.rounds) ? prepared.rounds : []).map((round) => ({
    ...round,
    actions: (Array.isArray(round.actions) ? round.actions : []).map((action, actionIndex) => {
      if (!action?.battlePpInput || allowed.has(actionIndex)) return action;
      return { ...action, battlePpInput: { ...action.battlePpInput, reflectToPokemon: false } };
    }),
  }));
  return prepared;
}

export function commitBattleRuntimePokemonRound({
  battleInput = {}, turn = {}, pokemon, ppActionIndexes = null,
  reflectedActionIndex = 0, reflectedTryUseMoveActionIndex = reflectedActionIndex,
  reflectedBattlerIndex = null,
} = {}) {
  const ppInput = restrictPpReflectionToActions(battleInput, ppActionIndexes);
  const ppCommitted = commitBattleSystemsPpRuntime({ battleInput: ppInput, turn, pokemon });
  let pokemonAfter;
  if (reflectedBattlerIndex !== null && reflectedBattlerIndex !== undefined) {
    const hpReflected = reflectBattleCoreBattlerHpToPokemonRuntime(
      ppCommitted.pokemon,
      turn,
      reflectedBattlerIndex,
      reflectedActionIndex,
    );
    const tryUseHpReflected = reflectBattleCoreTryUseMoveHpToPokemonRuntime(hpReflected, battleInput, reflectedTryUseMoveActionIndex);
    pokemonAfter = reflectBattleCoreAbilityItemActionAfterHpToPokemonRuntime(tryUseHpReflected, battleInput, reflectedBattlerIndex);
  } else {
    const hpReflected = reflectBattleCoreHpToPokemonRuntime(ppCommitted.pokemon, turn, reflectedActionIndex);
    const tryUseHpReflected = reflectBattleCoreTryUseMoveHpToPokemonRuntime(hpReflected, battleInput, reflectedTryUseMoveActionIndex);
    pokemonAfter = reflectBattleCoreAbilityItemActionAfterHpToPokemonRuntime(tryUseHpReflected, battleInput, reflectedActionIndex);
  }
  const tryUseStatus = reflectBattleCoreTryUseMoveStatusToPokemonRuntime(pokemonAfter, battleInput, reflectedTryUseMoveActionIndex);
  return { pokemon: tryUseStatus.pokemon, ppCommitted, tryUseStatusChanged: tryUseStatus.changed };
}

export function resolveBattleEndPersistenceIntegration({ decision, persistenceInput = null, reflectedPokemon = null, reflectedPartyIndex = 0, reflectMoves = false, reflectExpLevel = false, reflectStatus = false, reflectItem = false } = {}) {
  if (persistenceInput == null || Number(decision) === 0) return null;
  const prepared = structuredClone(persistenceInput);
  if (reflectedPokemon?.hp != null && Array.isArray(prepared.party)) {
    const index = Number(reflectedPartyIndex);
    if (Number.isInteger(index) && index >= 0 && index < prepared.party.length && prepared.party[index]) {
      prepared.party[index] = {
        ...prepared.party[index], hp: Number(reflectedPokemon.hp),
        ...(reflectMoves ? { moves: structuredClone(reflectedPokemon.moves) } : {}),
        ...(reflectExpLevel ? { exp: Number(reflectedPokemon.exp), level: Number(reflectedPokemon.level) } : {}),
        ...(reflectStatus ? { status: reflectedPokemon.status, status_count: Number(reflectedPokemon.status_count ?? 0) } : {}),
        ...(reflectItem ? { item: reflectedPokemon.item ?? null } : {}),
      };
    }
  }
  return resolvePostBattlePersistence(prepared);
}

export function prepareBattleRuntimeScheduledCombat({ battleInput: rawBattleInput = {} } = {}) {
  const ppPrepared = prepareBattleSystemsPpRuntime({ battleInput: rawBattleInput });
  const battleInput = ppPrepared.battleInput;
  const rounds = Array.isArray(battleInput?.rounds) ? battleInput.rounds : [];
  if (rounds.length !== 1) throw new Error("attack-phase integration adapter requires exactly one round");
  const round = rounds[0];
  const schedulerInput = {
    commandEntries: round.commandEntries ?? [], actions: round.actions ?? [],
    priorityEntries: round.priorityEntries ?? [], priorityEntriesByLoop: round.priorityEntriesByLoop ?? null,
    trickRoom: Boolean(round.trickRoom), mechanicsGeneration: Number(round.mechanicsGeneration ?? 9),
  };
  const scheduling = round.attackPhaseInput
    ? resolveAttackPhaseCanonical({ ...schedulerInput, ...round.attackPhaseInput })
    : resolveAttackPhaseMovesCanonical(schedulerInput);
  const turnRound = structuredClone(round);
  if (!round.attackPhaseInput) {
    delete turnRound.priorityEntries;
    delete turnRound.priorityEntriesByLoop;
  }
  turnRound.priorityOrder = scheduling.processOrder;
  if (round.attackPhaseInput && Number(scheduling.decision ?? 0) > 0) turnRound.attackDecision = Number(scheduling.decision);
  const preparedBattleInput = prepareCombatTurnInputCanonical({
    initialDecision: Number(battleInput.initialDecision ?? 0),
    ...(battleInput.combatRandomSeed === undefined ? {} : { combatRandomSeed: Number(battleInput.combatRandomSeed) & 0x7fffffff }),
    rounds: [turnRound],
  });
  return { ppPrepared, scheduling, preparedBattleInput };
}

function resolveRuntimeLoop(preparedBattleInput, allowIncompleteBattle) {
  return allowIncompleteBattle ? resolveGenericTurnVerticalSlice(preparedBattleInput, { allowIncomplete: true }) : resolveBattleLoopCanonical(preparedBattleInput);
}

export function resolveBattleRuntimeIntegration({ pokemon, sendOuts = [], battleInput: rawBattleInput = {}, preparedBattleInputTransform = null, ppActionIndexes = null, reflectedActionIndex = 0, reflectedTryUseMoveActionIndex = reflectedActionIndex, reflectedBattlerIndex = null, reflectedPartyIndex = 0, postBattlePersistenceInput = null, allowIncompleteBattle = true, weatherAnimation = null, terrainAnimation = null }) {
  const start = resolveBattleStartCore({ sendOuts, weatherAnimation, terrainAnimation });
  const reflectedBattleInput = prepareReflectedMajorStatusBattleInput({ battleInput: rawBattleInput, pokemon, reflectedBattlerIndex });
  const useAttackPhaseScheduler = reflectedBattleInput?.useAttackPhaseScheduler === true;
  const useCanonicalAccuracyDamage = reflectedBattleInput?.useCanonicalAccuracyDamage === true;
  let ppPrepared; let battleInput; let turn; let preparedBattleInput = battleInput; let attackPhaseScheduling = null;
  if (useAttackPhaseScheduler && useCanonicalAccuracyDamage) {
    const resolved = prepareBattleRuntimeScheduledCombat({ battleInput: reflectedBattleInput });
    ppPrepared = resolved.ppPrepared; battleInput = ppPrepared.battleInput; preparedBattleInput = resolved.preparedBattleInput;
    if (typeof preparedBattleInputTransform === "function") preparedBattleInput = preparedBattleInputTransform(preparedBattleInput);
    attackPhaseScheduling = resolved.scheduling; turn = resolveRuntimeLoop(preparedBattleInput, allowIncompleteBattle);
  } else {
    ppPrepared = prepareBattleSystemsPpRuntime({ battleInput: reflectedBattleInput }); battleInput = ppPrepared.battleInput; preparedBattleInput = battleInput;
    if (useAttackPhaseScheduler) {
      const rounds = Array.isArray(battleInput?.rounds) ? battleInput.rounds : [];
      if (rounds.length !== 1) throw new Error("attack-phase integration adapter requires exactly one round");
      const playable = resolvePlayableMoveRoundCanonical({ initialDecision: Number(battleInput.initialDecision ?? 0), round: rounds[0], allowIncomplete: allowIncompleteBattle });
      turn = playable.vertical; attackPhaseScheduling = playable.scheduling;
    } else if (useCanonicalAccuracyDamage) {
      preparedBattleInput = prepareCombatTurnInputCanonical(battleInput);
      if (typeof preparedBattleInputTransform === "function") preparedBattleInput = preparedBattleInputTransform(preparedBattleInput);
      turn = resolveRuntimeLoop(preparedBattleInput, allowIncompleteBattle);
    } else turn = resolveRuntimeLoop(battleInput, allowIncompleteBattle);
  }
  const reflected = commitBattleRuntimePokemonRound({ battleInput: preparedBattleInput, turn, pokemon, ppActionIndexes, reflectedActionIndex, reflectedTryUseMoveActionIndex, reflectedBattlerIndex });
  const ppCommitted = reflected.ppCommitted;
  const statusCommitted = commitBattleSystemsStatusRuntime({ battleInput: preparedBattleInput, turn, pokemon: reflected.pokemon, reflectedBattlerIndex });
  const heldItemCommitted = commitBattleSystemsHeldItemRuntime({ battleInput: preparedBattleInput, turn, pokemon: statusCommitted.pokemon, reflectedBattlerIndex });
  const expCommitted = commitBattleSystemsExpRuntime({ battleInput: preparedBattleInput, turn, pokemon: heldItemCommitted.pokemon });
  const reflectedPokemon = expCommitted.pokemon; const decision = Number(turn.decision);
  const postBattlePersistence = resolveBattleEndPersistenceIntegration({ decision, persistenceInput: postBattlePersistenceInput, reflectedPokemon, reflectedPartyIndex, reflectMoves: ppCommitted.commits.length > 0 || expCommitted.commits.length > 0, reflectExpLevel: expCommitted.commits.length > 0, reflectStatus: statusCommitted.commits.length > 0 || reflected.tryUseStatusChanged, reflectItem: heldItemCommitted.commits.length > 0 });
  return { start, turn, pokemon: reflectedPokemon, battleResultHandoff: { decision, postBattlePersistenceApplied: postBattlePersistence !== null }, ...(useCanonicalAccuracyDamage ? { combatTrace: { rounds: structuredClone(preparedBattleInput.rounds ?? []) } } : {}), ...(ppPrepared.operations.length || ppCommitted.commits.length ? { battlePpIntegration: { prepared: ppPrepared.operations, commits: ppCommitted.commits } } : {}), ...(statusCommitted.commits.length ? { battleStatusIntegration: { commits: statusCommitted.commits } } : {}), ...(reflected.tryUseStatusChanged ? { battleTryUseStatusReflection: true } : {}), ...(heldItemCommitted.commits.length ? { battleHeldItemIntegration: { commits: heldItemCommitted.commits } } : {}), ...(expCommitted.commits.length ? { battleExpIntegration: { commits: expCommitted.commits } } : {}), ...(postBattlePersistence ? { postBattlePersistence } : {}), ...(attackPhaseScheduling ? { attackPhaseScheduling } : {}) };
}
