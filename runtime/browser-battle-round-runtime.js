import { resolveBattleFightMenu } from "./battle-command-selection.js";
import { resolveBattleRuntimeIntegration } from "./battle-runtime-integration.js";
import { pokemonMoveTotalPp } from "./pokemon-runtime.js";
import { STRUGGLE_MOVE_CANONICAL } from "./battle-core-struggle-command.js";
import { buildBrowserBattleContinuationHandoff, materializeBattleParty, prepareBrowserPartyAwareJudgeStates } from "./browser-battle-party-judge.js";
import { resolveCanonicalBattleTypingV108 } from "./canonical-type-effectiveness-v108.js";
import { safariGeneralPokemonTypesV108 } from "./safari-general-species-type-facts.js";
import { resolveBattleSpeedCanonical } from "./battle-core-speed.js";
import { applyBattleStatStageChangesCanonical, createBattleStatStageStateCanonical, resolveBattleStatStageChangesCanonical } from "./battle-core-stat-stages.js";
import { buildRestStatusInputCanonical, isCanonicalFixedDamageFunction, resolveCanonicalFixedDamage } from "./battle-core-hp-function-effects.js";
import { resolveBattleAbilityItemHookCanonical } from "./battle-ability-item-hook-dispatch.js";
import { resolveMoveOrderAbilityItemExtensionCanonical } from "./battle-core-ability-item-move-order-extension.js";

function moveId(move) { return typeof move === "string" ? move : move?.id; }
function requireMoveMaster(moveMasters, id) {
  if (id === STRUGGLE_MOVE_CANONICAL.id) return STRUGGLE_MOVE_CANONICAL;
  const master = moveMasters?.[id];
  if (!master || master.id !== id) throw new TypeError(`move master is required for ${id}`);
  return master;
}
function requireBattleStats(pokemon, label) {
  if (!pokemon?.stats || typeof pokemon.stats !== "object") throw new TypeError(`${label} Pokemon stats are required`);
  for (const id of ["ATTACK", "DEFENSE", "SPECIAL_ATTACK", "SPECIAL_DEFENSE", "SPEED"]) if (!Number.isInteger(pokemon.stats[id]) || pokemon.stats[id] < 0) throw new TypeError(`${label} Pokemon stats.${id} is required`);
}
function requireBattleMoveRuntime(move, label) {
  if (!move || typeof move !== "object" || Array.isArray(move)) throw new TypeError(`${label} move must be materialized before battle`);
  if (!Number.isInteger(move.pp) || move.pp < 0) throw new TypeError(`${label} move pp must be a non-negative integer`);
  return move;
}
function browserCombatSeed() {
  if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === "function") {
    const value = new Uint32Array(1); globalThis.crypto.getRandomValues(value); return value[0] & 0x7fffffff;
  }
  return Math.floor(Math.random() * 0x80000000) & 0x7fffffff;
}
function hasPpBearingMove(pokemon) { return (Array.isArray(pokemon?.moves) ? pokemon.moves : []).some((move) => Number(move?.pp ?? 0) > 0); }
function resolveRoundMove({ pokemon, selectedMoveId, moveMasters, label, autoStruggle = false }) {
  const struggle = autoStruggle || selectedMoveId === STRUGGLE_MOVE_CANONICAL.id;
  if (struggle) {
    if (hasPpBearingMove(pokemon)) throw new RangeError(`${label} cannot auto-use Struggle while a PP-bearing move exists`);
    return { moveIndex: -1, move: STRUGGLE_MOVE_CANONICAL, struggle: true };
  }
  const moveIndex = pokemon.moves.findIndex((move) => moveId(move) === selectedMoveId);
  if (moveIndex < 0) throw new RangeError(`selected move is not known by the ${label} Pokemon`);
  const move = requireMoveMaster(moveMasters, selectedMoveId);
  const runtimeMove = requireBattleMoveRuntime(pokemon.moves[moveIndex], label);
  if (runtimeMove.pp <= 0) throw new RangeError("selected move has no PP");
  return { moveIndex, move, struggle: false };
}
function resolveBattleTypes(pokemon) {
  if (Array.isArray(pokemon?.types) && pokemon.types.length >= 1 && pokemon.types.length <= 2) return pokemon.types;
  try {
    return safariGeneralPokemonTypesV108(pokemon);
  } catch (error) {
    if (error instanceof RangeError) return null;
    throw error;
  }
}
function canonicalAbilityId(pokemon) {
  const ability = pokemon?.ability;
  const id = typeof ability === "string" ? ability : ability?.id;
  return String(id ?? "").toUpperCase();
}
export function buildBrowserBattleActionInput({ actor, target, move, moveIndex, battlerIndex, targetBattlerIndex, randomRoll = null, reflectPp, struggle = false }) {
  const special = move.category === "Special";
  const fixedDamageFunction = isCanonicalFixedDamageFunction(move.function_code);
  const damagingMove = move.category !== "Status" && (Number(move.power ?? 0) > 0 || fixedDamageFunction);
  const actorTypes = resolveBattleTypes(actor);
  const targetTypes = resolveBattleTypes(target);
  const typing = !struggle && damagingMove && move.type && actorTypes && targetTypes
    ? resolveCanonicalBattleTypingV108(move.type, actorTypes, targetTypes)
    : null;
  const actionBefore = resolveBattleAbilityItemHookCanonical({
    hook: "action_before",
    user: actor,
    target,
    move,
    selectedMoveId: move.id,
    context: { typeMod: typing?.multiplier ?? 1 },
  });
  const hookModifiers = actionBefore.modifiers ?? {};
  const abilityItemImmune = !struggle && damagingMove && Boolean(hookModifiers.typeImmunity);
  const targetImmune = Boolean(typing?.immune || abilityItemImmune);
  const accuracyInput = {
    baseAccuracy: move.accuracy,
    ...(hookModifiers.accuracyModifierInput ? { accuracyModifierInput: structuredClone(hookModifiers.accuracyModifierInput) } : {}),
  };
  if (randomRoll !== null && randomRoll !== undefined) accuracyInput.randomRoll = Number(randomRoll);
  const actorAbility = canonicalAbilityId(actor);
  const secondaryEffectInput = hookModifiers.secondaryEffectInput ?? {};
  const statStageChanges = struggle ? [] : resolveBattleStatStageChangesCanonical(move.function_code);
  const action = {
    kind: "move", battlerIndex, targetBattlerIndex,
    actorHpBefore: actor.hp, actorTotalHp: actor.max_hp,
    moveIndex, moveId: move.id, functionCode: move.function_code, moveCategory: move.category, accuracyInput,
    hpBefore: target.hp, totalHp: target.max_hp,
    mechanicsGeneration: 9,
    abilityItemActionBefore: actionBefore,
    userHasSereneGrace: Boolean(secondaryEffectInput.userHasSereneGrace),
    userHasSheerForce: Boolean(secondaryEffectInput.userHasSheerForce),
    targetHasShieldDust: Boolean(secondaryEffectInput.targetHasShieldDust),
    moldBreaker: Boolean(secondaryEffectInput.moldBreaker),
    hpFunctionInput: {
      functionCode: move.function_code,
      actorStatus: actor.status ?? "NONE",
      actorAbility,
      targetAffected: !targetImmune,
      struggle: Boolean(struggle),
    },
  };
  if (abilityItemImmune) action.abilityItemTypeImmunityResolution = structuredClone(hookModifiers.typeImmunityResolution ?? null);
  if (statStageChanges.length > 0) {
    action.statStageEffectInput = {
      functionCode: move.function_code,
      moveCategory: move.category,
      changes: statStageChanges,
    };
  }
  const actorStatus = String(actor.status ?? "NONE").toUpperCase();
  if (["PARALYSIS", "SLEEP", "FROZEN"].includes(actorStatus)) {
    action.useMoveInput = {
      isStruggle: Boolean(struggle),
      tryUseMoveInput: {
        status: actorStatus,
        statusCount: Number(actor.status_count ?? 0),
        moveUsableWhenAsleep: Boolean(move.usable_when_asleep),
        moveThawsUser: Boolean(move.thaws_user),
      },
    };
  }
  const fixedDamage = resolveCanonicalFixedDamage({
    functionCode: move.function_code,
    actorHp: actor.hp,
    actorLevel: actor.level,
    targetHp: target.hp,
  });
  if (fixedDamage !== null && !targetImmune) {
    action.fixedDamageInput = {
      damage: fixedDamage,
      functionCode: move.function_code,
      source: "canonical HP function owner",
    };
  } else if (damagingMove && !targetImmune) {
    const damageCalculationInput = hookModifiers.damageCalculationInput ?? {};
    action.damageInput = {
      level: actor.level,
      baseDamage: move.power,
      attack: actor.stats[special ? "SPECIAL_ATTACK" : "ATTACK"],
      defense: target.stats[special ? "SPECIAL_DEFENSE" : "DEFENSE"],
      attackStageIndex: 6,
      defenseStageIndex: 6,
      userUnaware: Boolean(damageCalculationInput.userUnaware),
      targetUnaware: Boolean(damageCalculationInput.targetUnaware),
      moldBreaker: Boolean(secondaryEffectInput.moldBreaker),
      damageMultiplierInput: {
        ...(hookModifiers.damageMultiplierInput ?? {}),
        type: move.type ?? null,
        physicalMove: move.category === "Physical",
        specialMove: special,
        userStatus: actor.status ?? "NONE",
        ...(typing ? { userHasType: typing.userHasType, typeMod: typing.multiplier } : {}),
      },
    };
  }
  if (typing) action.typeEffectivenessResolution = typing;
  if (targetImmune && damagingMove) {
    action.hitLoopInput = {
      targetIndexes: [targetBattlerIndex],
      moveTargetCount: 1,
      numHits: 1,
      targetChecks: [{
        index: targetBattlerIndex,
        initialSuccessCheckInput: { damagingMove: true, typeIneffective: true, typeMod: 0 },
      }],
    };
  }
  if (struggle) action.specialUsage = true;
  const restStatusInput = buildRestStatusInputCanonical({
    functionCode: move.function_code,
    actorStatus: actor.status,
    actorHp: actor.hp,
    actorMaxHp: actor.max_hp,
    battlerIndex,
  });
  if (restStatusInput) action.battleStatusInput = restStatusInput;
  if (reflectPp) {
    const pokemonMove = structuredClone(actor.moves[moveIndex]);
    action.battlePpInput = { move: { ...pokemonMove, totalPp: pokemonMoveTotalPp(move.total_pp, pokemonMove.ppup ?? 0) }, pokemonMoveIndex: moveIndex, baseTotalPp: move.total_pp };
  }
  return action;
}

export function buildBrowserBattlePriorityEntry({ action, pokemon, move, statStages, actionIndex, battlerIndex }) {
  const speedInput = action?.abilityItemActionBefore?.modifiers?.speedInput ?? {};
  const speedStage = Number(statStages?.[Number(battlerIndex)]?.SPEED ?? 0);
  const klutz = canonicalAbilityId(pokemon) === "KLUTZ";
  const moveOrderUser = klutz ? { ...pokemon, held_item: null, item: null, held_item_effect_suppressed: true } : pokemon;
  const moveOrder = resolveMoveOrderAbilityItemExtensionCanonical({ user: moveOrderUser, move });
  // Consumable/probabilistic move-first effects stay inert here until their RNG/consume request is committed live.
  const liveMoveOrder = moveOrder.consumeRequest ? null : moveOrder;
  return {
    actionIndex: Number(actionIndex),
    battlerIndex: Number(battlerIndex),
    speed: resolveBattleSpeedCanonical({
      baseSpeed: pokemon.stats.SPEED,
      speedStage,
      status: pokemon.status ?? "NONE",
      mechanicsGeneration: 9,
      ...speedInput,
    }),
    movePriority: Number(move?.priority ?? 0) + Number(action?.abilityItemActionBefore?.priorityModifier ?? 0),
    abilitySubPriority: Number(liveMoveOrder?.abilitySubPriority ?? 0),
    itemSubPriority: Number(liveMoveOrder?.itemSubPriority ?? 0),
  };
}

function annotateRuntimeOperation(operation, preparedRound) {
  if (!Number.isInteger(operation?.action)) return operation;
  const actionIndex = Number(operation.action); const action = preparedRound.actions[actionIndex]; const actor = actionIndex === 0 ? "player" : "foe"; const target = actionIndex === 0 ? "foe" : "player";
  const annotated = { ...operation, actor, target, moveId: action?.moveId ?? null };
  if (operation.op === "faint") annotated.target = target;
  if (operation.op === "reduce_self_hp" || operation.op === "faint_self") annotated.target = actor;
  return annotated;
}
function presentationOperations(turnOperations, preparedRound, selection) {
  const operations = [];
  for (const operation of turnOperations) {
    operations.push(annotateRuntimeOperation(operation, preparedRound));
    if (operation.op === "command_phase") operations.push(...selection.operations.map((entry) => ({ ...entry, round: operation.round })));
  }
  return operations;
}
function attachDefeatedFoeExpInput(preparedBattleInput, { foePartyIndex, initialFoeHp, battleExpInput } = {}) {
  if (!battleExpInput || Number(initialFoeHp ?? 0) <= 0) return preparedBattleInput;
  let previousFoeHp = Number(initialFoeHp);
  for (const round of preparedBattleInput.rounds ?? []) {
    const actions = Array.isArray(round.actions) ? round.actions : [];
    const order = Array.isArray(round.priorityOrder) ? round.priorityOrder.map(Number) : actions.map((_, index) => index);
    for (const actionIndex of order) {
      const action = actions[actionIndex];
      if (!action || action.kind !== "move") continue;
      const currentFoeHp = Number(action?.judgeState?.foeParty?.[Number(foePartyIndex)]?.hp ?? previousFoeHp);
      if (previousFoeHp > 0 && currentFoeHp <= 0) {
        action.battleExpInput = structuredClone(battleExpInput);
        return preparedBattleInput;
      }
      previousFoeHp = currentFoeHp;
    }
  }
  return preparedBattleInput;
}
function expFlowOperations(expIntegration) {
  return (expIntegration?.commits ?? []).flatMap((commit) => (commit.operations ?? []).map((operation) => ({
    ...operation,
    scope: "exp",
    action: Number(commit.actionIndex),
    round: Number(commit.roundIndex) + 1,
  })));
}

export function applyBrowserBattleTurnEndStatStagesCanonical({ statStages, playerTurnEndIntegration = null, foeTurnEndIntegration = null } = {}) {
  let state = createBattleStatStageStateCanonical(statStages);
  const applied = [];
  for (const entry of [
    { integration: playerTurnEndIntegration, userBattlerIndex: 0, targetBattlerIndex: 1 },
    { integration: foeTurnEndIntegration, userBattlerIndex: 1, targetBattlerIndex: 0 },
  ]) {
    const changes = entry.integration?.statChanges ?? [];
    if (!Array.isArray(changes) || changes.length === 0) continue;
    const resolved = applyBattleStatStageChangesCanonical(state, changes, entry.userBattlerIndex, entry.targetBattlerIndex);
    state = resolved.state;
    applied.push(...resolved.applied);
  }
  return Object.freeze({ state, applied: Object.freeze(applied) });
}

export function resolveBrowserBattleRound({ player, foe, playerParty = null, foeParty = null, playerActivePartyIndex = 0, foeActivePartyIndex = 0, selectedMoveId, foeMoveId, moveMasters, combatRandomSeed = browserCombatSeed(), priorityRandomSeed = browserCombatSeed(), playerRandomRoll = null, foeRandomRoll = null, playerBattleExpInput = null, postBattlePersistenceInput = null, reflectedPartyIndex = 0, playerActionConsumedWithoutMove = false, battleStatStages = null } = {}) {
  requireBattleStats(player, "player"); requireBattleStats(foe, "foe");
  const statStages = createBattleStatStageStateCanonical(battleStatStages);
  const playerPartyState = materializeBattleParty(playerParty, playerActivePartyIndex, player, "player"); const foePartyState = materializeBattleParty(foeParty, foeActivePartyIndex, foe, "foe");
  const playerHasPp = hasPpBearingMove(player); const foeHasPp = hasPpBearingMove(foe);
  const playerResolved = playerActionConsumedWithoutMove ? null : resolveRoundMove({ pokemon: player, selectedMoveId: playerHasPp ? selectedMoveId : STRUGGLE_MOVE_CANONICAL.id, moveMasters, label: "player", autoStruggle: !playerHasPp });
  const foeResolved = resolveRoundMove({ pokemon: foe, selectedMoveId: foeMoveId, moveMasters, label: "foe", autoStruggle: !foeHasPp });
  const playerMoveIndex = playerResolved?.moveIndex ?? null; const foeMoveIndex = foeResolved.moveIndex; const playerMove = playerResolved?.move ?? null; const foeMove = foeResolved.move;
  const selection = !playerResolved || playerResolved.struggle ? { result: null, operations: [] } : resolveBattleFightMenu({ idxBattler: 0, moves: player.moves.map((move) => { const id = moveId(move); return { id, name: requireMoveMaster(moveMasters, id).name, pp: Number(move.pp) }; }), selections: [playerMoveIndex], accepted: { [playerMoveIndex]: true } });
  const commandEntry = (battlerIndex, ownedByPlayer, resolved, targetIndex) => resolved.struggle ? { battlerIndex, ownedByPlayer, canShowFightMenu: false, struggleMoveId: "STRUGGLE", targetIndex } : { battlerIndex, ownedByPlayer, selectedMoveIndex: resolved.moveIndex, selectedMoveId: resolved.move.id, targetIndex };
  const actions = [
    playerResolved ? buildBrowserBattleActionInput({ actor: player, target: foe, move: playerMove, moveIndex: playerMoveIndex, battlerIndex: 0, targetBattlerIndex: 1, randomRoll: playerRandomRoll, reflectPp: !playerResolved.struggle, struggle: playerResolved.struggle }) : null,
    buildBrowserBattleActionInput({ actor: foe, target: player, move: foeMove, moveIndex: foeMoveIndex, battlerIndex: 1, targetBattlerIndex: 0, randomRoll: foeRandomRoll, reflectPp: !foeResolved.struggle, struggle: foeResolved.struggle }),
  ];
  const commandEntries = [
    ...(playerResolved ? [commandEntry(0, true, playerResolved, 1)] : []),
    commandEntry(1, false, foeResolved, 0),
  ];
  const priorityEntries = [
    ...(playerResolved ? [buildBrowserBattlePriorityEntry({ action: actions[0], pokemon: player, move: playerMove, statStages, actionIndex: 0, battlerIndex: 0 })] : []),
    buildBrowserBattlePriorityEntry({ action: actions[1], pokemon: foe, move: foeMove, statStages, actionIndex: 1, battlerIndex: 1 }),
  ];
  const round = { statStages, attackPhaseInput: { priorityRandomSeed: Number(priorityRandomSeed) & 0x7fffffff, battlers: [{ battlerIndex: 0, choiceKind: playerResolved ? "UseMove" : "None", fainted: player.hp <= 0, choseRageFunction: false }, { battlerIndex: 1, choiceKind: "UseMove", fainted: foe.hp <= 0, choseRageFunction: false }] }, commandEntries, priorityEntries, actions };
  const battleInput = { useAttackPhaseScheduler: true, useCanonicalAccuracyDamage: true, combatRandomSeed: Number(combatRandomSeed) & 0x7fffffff, rounds: [round] };
  const partyAwareJudgeTransform = (preparedBattleInput) => prepareBrowserPartyAwareJudgeStates(preparedBattleInput, { playerParty: playerPartyState.party, foeParty: foePartyState.party, playerPartyIndex: playerPartyState.activePartyIndex, foePartyIndex: foePartyState.activePartyIndex });
  const playerRuntimeTransform = (preparedBattleInput) => attachDefeatedFoeExpInput(
    partyAwareJudgeTransform(preparedBattleInput),
    { foePartyIndex: foePartyState.activePartyIndex, initialFoeHp: foe.hp, battleExpInput: playerBattleExpInput },
  );
  const playerRuntime = resolveBattleRuntimeIntegration({ pokemon: player, sendOuts: [[0, player.species], [1, foe.species]], battleInput, preparedBattleInputTransform: playerRuntimeTransform, ppActionIndexes: playerResolved && !playerResolved.struggle ? [0] : [], reflectedActionIndex: 1, reflectedTryUseMoveActionIndex: playerResolved ? 0 : null, reflectedBattlerIndex: 0, reflectedPartyIndex, postBattlePersistenceInput, allowIncompleteBattle: true });
  const foeRuntime = resolveBattleRuntimeIntegration({ pokemon: foe, sendOuts: [[0, player.species], [1, foe.species]], battleInput, preparedBattleInputTransform: partyAwareJudgeTransform, ppActionIndexes: foeResolved.struggle ? [] : [1], reflectedActionIndex: playerResolved ? 0 : null, reflectedTryUseMoveActionIndex: 1, reflectedBattlerIndex: 1, allowIncompleteBattle: true });
  const scheduling = playerRuntime.attackPhaseScheduling; const combat = playerRuntime.combatTrace; const preparedRound = combat.rounds[0]; const rawDecision = Number(playerRuntime.turn.decision); const playerExp = playerRuntime.battleExpIntegration ?? { commits: [] }; const operations = [...presentationOperations(playerRuntime.turn.operations, preparedRound, selection), ...expFlowOperations(playerExp)]; const playerPp = playerRuntime.battlePpIntegration ?? { prepared: [], commits: [] }; const foePp = foeRuntime.battlePpIntegration ?? { prepared: [], commits: [] }; const postBattlePersistence = playerRuntime.postBattlePersistence ?? null;
  const resolvedPlayer = playerRuntime.pokemon;
  const resolvedFoe = foeRuntime.pokemon;
  const turnEndStages = applyBrowserBattleTurnEndStatStagesCanonical({
    statStages: preparedRound?.statStages ?? statStages,
    playerTurnEndIntegration: playerRuntime.battleAbilityItemTurnEndIntegration ?? null,
    foeTurnEndIntegration: foeRuntime.battleAbilityItemTurnEndIntegration ?? null,
  });
  const battleContinuationHandoff = buildBrowserBattleContinuationHandoff({ playerParty: playerPartyState.party, foeParty: foePartyState.party, playerPartyIndex: playerPartyState.activePartyIndex, foePartyIndex: foePartyState.activePartyIndex, playerPokemon: resolvedPlayer, foePokemon: resolvedFoe, decision: rawDecision });
  const decision = Number(battleContinuationHandoff.decision);
  return { player: resolvedPlayer, foe: resolvedFoe, decision, operations, selection, scheduling, statStages: structuredClone(turnEndStages.state), combatRandomSeed: Number(combatRandomSeed) & 0x7fffffff, priorityRandomSeed: Number(priorityRandomSeed) & 0x7fffffff, struggle: { player: Boolean(playerResolved?.struggle), foe: foeResolved.struggle }, playerActionConsumedWithoutMove: Boolean(playerActionConsumedWithoutMove), ppIntegration: { prepared: playerPp.prepared, commits: [...playerPp.commits.map((commit) => ({ ...commit, actor: "player" })), ...foePp.commits.map((commit) => ({ ...commit, actor: "foe" }))] }, expIntegration: { commits: playerExp.commits }, battleContinuationHandoff, battleResultHandoff: { ...playerRuntime.battleResultHandoff, decision, postBattlePersistence }, battleRuntimeIntegration: { start: playerRuntime.start, combatTrace: combat, awaitingNextRound: decision === 0 && Boolean(playerRuntime.turn.awaitingNextRound), playerPpCommits: playerPp.commits.length, foePpCommits: foePp.commits.length, playerExpCommits: playerExp.commits.length, turnEndStatStageApplied: structuredClone(turnEndStages.applied), postBattlePersistenceApplied: postBattlePersistence !== null, partyAwareJudge: true } };
}
