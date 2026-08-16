import { resolveBattleFightMenu } from "./battle-command-selection.js";
import { resolveBattleRuntimeIntegration } from "./battle-runtime-integration.js";
import { pokemonMoveTotalPp } from "./pokemon-runtime.js";
import { STRUGGLE_MOVE_CANONICAL } from "./battle-core-struggle-command.js";
import { buildBrowserBattleContinuationHandoff, materializeBattleParty, prepareBrowserPartyAwareJudgeStates } from "./browser-battle-party-judge.js";
import { projectBrowserBattleResolvedHp } from "./browser-battle-round-hp-projection.js";

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
function actionInput({ actor, target, move, moveIndex, battlerIndex, targetBattlerIndex, randomRoll = null, reflectPp, struggle = false }) {
  const special = move.category === "Special";
  const accuracyInput = { baseAccuracy: move.accuracy };
  if (randomRoll !== null && randomRoll !== undefined) accuracyInput.randomRoll = Number(randomRoll);
  const action = { kind: "move", battlerIndex, targetBattlerIndex, actorHpBefore: actor.hp, actorTotalHp: actor.max_hp, moveIndex, moveId: move.id, accuracyInput, damageInput: { level: actor.level, baseDamage: move.power, attack: actor.stats[special ? "SPECIAL_ATTACK" : "ATTACK"], defense: target.stats[special ? "SPECIAL_DEFENSE" : "DEFENSE"], attackStageIndex: 6, defenseStageIndex: 6, damageMultiplierInput: { type: move.type ?? null, physicalMove: move.category === "Physical", specialMove: special } }, hpBefore: target.hp, totalHp: target.max_hp };
  if (struggle) { action.specialUsage = true; action.selfDamageAfterHit = Math.round(Number(actor.max_hp) / 4); action.registerSelfDamage = false; }
  if (reflectPp) {
    const pokemonMove = structuredClone(actor.moves[moveIndex]);
    action.battlePpInput = { move: { ...pokemonMove, totalPp: pokemonMoveTotalPp(move.total_pp, pokemonMove.ppup ?? 0) }, pokemonMoveIndex: moveIndex, baseTotalPp: move.total_pp };
  }
  return action;
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
export function resolveBrowserBattleRound({ player, foe, playerParty = null, foeParty = null, playerActivePartyIndex = 0, foeActivePartyIndex = 0, selectedMoveId, foeMoveId, moveMasters, combatRandomSeed = browserCombatSeed(), priorityRandomSeed = browserCombatSeed(), playerRandomRoll = null, foeRandomRoll = null, postBattlePersistenceInput = null, reflectedPartyIndex = 0 } = {}) {
  requireBattleStats(player, "player"); requireBattleStats(foe, "foe");
  const playerPartyState = materializeBattleParty(playerParty, playerActivePartyIndex, player, "player"); const foePartyState = materializeBattleParty(foeParty, foeActivePartyIndex, foe, "foe");
  const playerHasPp = hasPpBearingMove(player); const foeHasPp = hasPpBearingMove(foe);
  const playerResolved = resolveRoundMove({ pokemon: player, selectedMoveId: playerHasPp ? selectedMoveId : STRUGGLE_MOVE_CANONICAL.id, moveMasters, label: "player", autoStruggle: !playerHasPp });
  const foeResolved = resolveRoundMove({ pokemon: foe, selectedMoveId: foeMoveId, moveMasters, label: "foe", autoStruggle: !foeHasPp });
  const playerMoveIndex = playerResolved.moveIndex; const foeMoveIndex = foeResolved.moveIndex; const playerMove = playerResolved.move; const foeMove = foeResolved.move;
  const selection = playerResolved.struggle ? { result: null, operations: [] } : resolveBattleFightMenu({ idxBattler: 0, moves: player.moves.map((move) => { const id = moveId(move); return { id, name: requireMoveMaster(moveMasters, id).name, pp: Number(move.pp) }; }), selections: [playerMoveIndex], accepted: { [playerMoveIndex]: true } });
  const commandEntry = (battlerIndex, ownedByPlayer, resolved, targetIndex) => resolved.struggle ? { battlerIndex, ownedByPlayer, canShowFightMenu: false, struggleMoveId: "STRUGGLE", targetIndex } : { battlerIndex, ownedByPlayer, selectedMoveIndex: resolved.moveIndex, selectedMoveId: resolved.move.id, targetIndex };
  const round = { attackPhaseInput: { priorityRandomSeed: Number(priorityRandomSeed) & 0x7fffffff, battlers: [{ battlerIndex: 0, choiceKind: "UseMove", fainted: player.hp <= 0, choseRageFunction: false }, { battlerIndex: 1, choiceKind: "UseMove", fainted: foe.hp <= 0, choseRageFunction: false }] }, commandEntries: [commandEntry(0, true, playerResolved, 1), commandEntry(1, false, foeResolved, 0)], priorityEntries: [{ actionIndex: 0, battlerIndex: 0, speed: player.stats.SPEED, movePriority: playerMove.priority }, { actionIndex: 1, battlerIndex: 1, speed: foe.stats.SPEED, movePriority: foeMove.priority }], actions: [actionInput({ actor: player, target: foe, move: playerMove, moveIndex: playerMoveIndex, battlerIndex: 0, targetBattlerIndex: 1, randomRoll: playerRandomRoll, reflectPp: !playerResolved.struggle, struggle: playerResolved.struggle }), actionInput({ actor: foe, target: player, move: foeMove, moveIndex: foeMoveIndex, battlerIndex: 1, targetBattlerIndex: 0, randomRoll: foeRandomRoll, reflectPp: !foeResolved.struggle, struggle: foeResolved.struggle })] };
  const battleInput = { useAttackPhaseScheduler: true, useCanonicalAccuracyDamage: true, combatRandomSeed: Number(combatRandomSeed) & 0x7fffffff, rounds: [round] };
  const partyAwareJudgeTransform = (preparedBattleInput) => prepareBrowserPartyAwareJudgeStates(preparedBattleInput, { playerParty: playerPartyState.party, foeParty: foePartyState.party, playerPartyIndex: playerPartyState.activePartyIndex, foePartyIndex: foePartyState.activePartyIndex });
  const playerRuntime = resolveBattleRuntimeIntegration({ pokemon: player, sendOuts: [[0, player.species], [1, foe.species]], battleInput, preparedBattleInputTransform: partyAwareJudgeTransform, ppActionIndexes: playerResolved.struggle ? [] : [0], reflectedActionIndex: 1, reflectedTryUseMoveActionIndex: 0, reflectedBattlerIndex: 0, reflectedPartyIndex, postBattlePersistenceInput, allowIncompleteBattle: true });
  const foeRuntime = resolveBattleRuntimeIntegration({ pokemon: foe, sendOuts: [[0, player.species], [1, foe.species]], battleInput, preparedBattleInputTransform: partyAwareJudgeTransform, ppActionIndexes: foeResolved.struggle ? [] : [1], reflectedActionIndex: 0, reflectedTryUseMoveActionIndex: 1, reflectedBattlerIndex: 1, allowIncompleteBattle: true });
  const scheduling = playerRuntime.attackPhaseScheduling; const combat = playerRuntime.combatTrace; const preparedRound = combat.rounds[0]; const decision = Number(playerRuntime.turn.decision); const operations = presentationOperations(playerRuntime.turn.operations, preparedRound, selection); const playerPp = playerRuntime.battlePpIntegration ?? { prepared: [], commits: [] }; const foePp = foeRuntime.battlePpIntegration ?? { prepared: [], commits: [] }; const postBattlePersistence = playerRuntime.postBattlePersistence ?? null;
  const resolvedPlayer = projectBrowserBattleResolvedHp(playerRuntime.pokemon, operations, "player");
  const resolvedFoe = projectBrowserBattleResolvedHp(foeRuntime.pokemon, operations, "foe");
  const battleContinuationHandoff = buildBrowserBattleContinuationHandoff({ playerParty: playerPartyState.party, foeParty: foePartyState.party, playerPartyIndex: playerPartyState.activePartyIndex, foePartyIndex: foePartyState.activePartyIndex, playerPokemon: resolvedPlayer, foePokemon: resolvedFoe, decision });
  return { player: resolvedPlayer, foe: resolvedFoe, decision, operations, selection, scheduling, combatRandomSeed: Number(combatRandomSeed) & 0x7fffffff, priorityRandomSeed: Number(priorityRandomSeed) & 0x7fffffff, struggle: { player: playerResolved.struggle, foe: foeResolved.struggle }, ppIntegration: { prepared: playerPp.prepared, commits: [...playerPp.commits.map((commit) => ({ ...commit, actor: "player" })), ...foePp.commits.map((commit) => ({ ...commit, actor: "foe" }))] }, battleContinuationHandoff, battleResultHandoff: { ...playerRuntime.battleResultHandoff, postBattlePersistence }, battleRuntimeIntegration: { start: playerRuntime.start, combatTrace: combat, awaitingNextRound: Boolean(playerRuntime.turn.awaitingNextRound), playerPpCommits: playerPp.commits.length, foePpCommits: foePp.commits.length, postBattlePersistenceApplied: postBattlePersistence !== null, partyAwareJudge: true } };
}
