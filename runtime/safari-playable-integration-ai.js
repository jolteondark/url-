export * from "./safari-playable-integration.js?canonical-base=1";

import {
  createSafariPlayableRuntime as createSafariPlayableRuntimeBase,
  loadSafariPlayableRun as loadSafariPlayableRunBase,
  resolveSafariBattleRound as resolveSafariBattleRoundBase,
} from "./safari-playable-integration.js?canonical-base=1";
import { resolveTrainerMoveChoiceWithPriorityFlinchCanonical } from "./battle-core-trainer-choice-priority-flinch-integration.js";
import { SAFARI_MOVE_MASTERS } from "./safari-playable-data.js";

function exposeRuntime(runtime) {
  globalThis.__maplessSafariRuntime = runtime;
  return runtime;
}

export function createSafariPlayableRuntime() {
  return exposeRuntime(createSafariPlayableRuntimeBase());
}

export function loadSafariPlayableRun(storage, currentRuntime = createSafariPlayableRuntime()) {
  const loaded = loadSafariPlayableRunBase(storage, currentRuntime);
  if (loaded?.found && loaded.state) exposeRuntime(loaded.state);
  return loaded;
}

function moveId(move) { return typeof move === "string" ? move : move?.id; }
function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}
function usableTrainerMoves(foe) {
  return (Array.isArray(foe?.moves) ? foe.moves : [])
    .map((move, moveIndex) => ({ move, moveIndex, id: moveId(move) }))
    .filter(({ move, id }) => id && SAFARI_MOVE_MASTERS[id] && (typeof move === "string" || Number(move.pp ?? 0) > 0));
}
function trainerAiSeed(battle) {
  const trainerSeed = Number(battle?.trainer_seed ?? 0) & 0x7fffffff;
  const turn = Math.max(1, Math.trunc(Number(battle?.turn ?? 1)));
  return (trainerSeed ^ Math.imul(turn, 0x45d9f3b)) & 0x7fffffff;
}
function speedOf(pokemon) { return Number(pokemon?.stats?.SPEED ?? pokemon?.stats?.speed ?? 0); }
function restoreMoveOrder(foe, originalIds) {
  if (!foe || !Array.isArray(foe.moves)) return;
  const buckets = new Map();
  for (const move of foe.moves) { const id = moveId(move); const bucket = buckets.get(id) ?? []; bucket.push(move); buckets.set(id, bucket); }
  const restored = [];
  for (const id of originalIds) { const bucket = buckets.get(id); if (bucket?.length) restored.push(bucket.shift()); }
  for (const bucket of buckets.values()) restored.push(...bucket);
  if (restored.length === foe.moves.length) foe.moves = restored;
}
function prepareTrainerMove(runtime) {
  const state = stateOf(runtime);
  const battle = state.battle;
  if (!battle || battle.completed || battle.kind !== "trainer") return null;
  const player = runtime.player?.party?.[0];
  if (!player) throw new Error("active player Pokemon is required for trainer AI");
  const usable = usableTrainerMoves(battle.foe);
  if (!usable.length) throw new Error("trainer AI has no usable projected move; Struggle ownership is not connected yet");
  const skill = Number(battle.skill_level ?? 0);
  const foeSpeed = speedOf(battle.foe);
  const playerSpeed = speedOf(player);
  const candidates = usable.map(({ moveIndex, id }) => ({
    moveIndex,
    targetIndex: 0,
    userPokemon: battle.foe,
    targetPokemon: player,
    moveMaster: SAFARI_MOVE_MASTERS[id],
    skill,
    baseScore: 100,
    resolvedFacts: {
      targetFasterThanUser: playerSpeed > foeSpeed,
      userFasterThanTarget: foeSpeed > playerSpeed,
    },
  }));
  const resolution = resolveTrainerMoveChoiceWithPriorityFlinchCanonical({
    candidates,
    skill,
    turnCount: Math.max(0, Number(battle.turn ?? 1) - 1),
    canSwitchLax: false,
    aiRandomSeed: trainerAiSeed(battle),
  });
  if (resolution.command !== "move" || !Number.isInteger(resolution.moveIndex)) throw new Error(`trainer AI command is not connected to Safari round execution: ${resolution.command}`);
  const originalMoves = [...battle.foe.moves];
  const originalIds = originalMoves.map(moveId);
  const selected = originalMoves[resolution.moveIndex];
  if (!selected) throw new RangeError("trainer AI selected an invalid move index");
  battle.foe.moves = [selected, ...originalMoves.filter((_, index) => index !== resolution.moveIndex)];
  return { trainerPartyIndex: battle.trainer_party_index, foeSpecies: battle.foe.species, originalIds, resolution, selectedMoveId: moveId(selected) };
}
function lastHpAfter(operations, target) {
  let hp = null;
  for (const operation of operations ?? []) {
    if (operation?.target !== target) continue;
    if ((operation.op === "reduce_hp" || operation.op === "reduce_self_hp") && Number.isFinite(Number(operation.hpAfter))) {
      hp = Math.max(0, Math.trunc(Number(operation.hpAfter)));
    } else if (operation.op === "faint" || operation.op === "faint_self") {
      hp = 0;
    }
  }
  return hp;
}
function foeWasReplaced(result) {
  return result?.foeReplacementApplied === true
    || result?.replacementApplied === true
    || result?.trainerReplacementContinuation?.result === "continued_with_replacement";
}
function applyResolvedHp(runtime, result) {
  const state = stateOf(runtime);
  const battle = state.battle;
  if (!battle) return;
  const foeHp = lastHpAfter(result?.operations, "foe");
  // A trainer replacement is applied before this AI facade regains control.
  // The foe HP operations belong to the Pokemon that just fainted, not the
  // newly active reserve. Never replay the old foe's HP=0 onto its replacement.
  if (!foeWasReplaced(result) && foeHp !== null && battle.foe) {
    battle.foe.hp = Math.min(Number(battle.foe.max_hp ?? foeHp), foeHp);
  }
  const playerHp = lastHpAfter(result?.operations, "player");
  if (playerHp !== null && runtime.player?.party?.[0]) {
    const player = runtime.player.party[0];
    player.hp = Math.min(Number(player.max_hp ?? playerHp), playerHp);
  }
}
export function resolveSafariBattleRound(runtime, selectedMoveId) {
  const prepared = prepareTrainerMove(runtime);
  const result = resolveSafariBattleRoundBase(runtime, selectedMoveId);
  applyResolvedHp(runtime, result);
  if (!prepared) return result;
  const state = stateOf(runtime);
  const battle = state.battle;
  if (battle && battle.kind === "trainer" && battle.trainer_party_index === prepared.trainerPartyIndex && battle.foe?.species === prepared.foeSpecies) restoreMoveOrder(battle.foe, prepared.originalIds);
  return { ...result, trainerAi: { selectedMoveId: prepared.selectedMoveId, command: prepared.resolution.command, reason: prepared.resolution.reason, choices: prepared.resolution.choices, weightedChoices: prepared.resolution.weightedChoices, randomRolls: prepared.resolution.randomRolls } };
}
