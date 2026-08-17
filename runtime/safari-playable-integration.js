import * as playable from "./safari-playable-integration-boundary.js";
import { resolveTrainerMoveChoiceWithPriorityFlinchCanonical } from "./battle-core-trainer-choice-priority-flinch-integration.js";
import { SAFARI_MOVE_MASTERS } from "./safari-playable-data.js";
import { ensureSafariGeneralData, safariGeneralDataReady } from "./safari-general-data-demand.js";
import { stabilizeSafariKoPresentation } from "./safari-ko-presentation-safety.js";

export * from "./safari-playable-integration-boundary.js";
export { SAFARI_MOVE_PRESENTATION } from "./safari-move-presentation-live.js";
export { activateSafariDayBoardCell } from "./safari-pokemon-center-command.js";
export { attemptSafariCapture } from "./safari-capture-command.js";
export { safariShopPresentation } from "./safari-shop-display-presentation.js";

function exposeRuntime(runtime) {
  globalThis.__maplessSafariRuntime = runtime;
  return runtime;
}

export function createSafariPlayableRuntime() {
  return exposeRuntime(playable.createSafariPlayableRuntime());
}

export function loadSafariPlayableRun(storage, currentRuntime = createSafariPlayableRuntime()) {
  const loaded = playable.loadSafariPlayableRun(storage, currentRuntime);
  if (loaded?.found && loaded.state) exposeRuntime(loaded.state);
  return loaded;
}

function moveId(move) {
  return typeof move === "string" ? move : move?.id;
}

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new TypeError("runtime variables.mapless state is required");
  }
  return state;
}

export function returnSafariToDayBoard(runtime) {
  const state = stateOf(runtime);
  const wasBoundary = state.battle?.origin === "boundary_trial";
  const decision = Number(state.battle?.decision ?? 0);
  const result = playable.returnSafariToDayBoard(runtime);
  if (wasBoundary && decision === 1 && result?.target === "day_board") {
    state.boundary_trial = {
      ...(state.boundary_trial ?? {}),
      trial_cleared: false,
      trial_floor: null,
      result: "returned_to_board",
      battle_request: null,
    };
  }
  return result;
}

function battleNeedsGeneralData(battle) {
  if (!battle || battle.completed) return false;
  if (battle.origin === "boundary_trial") return true;
  if (battle.general_selection != null) return true;
  return battle.kind === "trainer"
    && battle.origin !== "village_bounty"
    && Array.isArray(battle.trainer?.party);
}

function trainerAiSeed(battle) {
  const trainerSeed = Number(battle?.trainer_seed ?? 0) & 0x7fffffff;
  const turn = Math.max(1, Math.trunc(Number(battle?.turn ?? 1)));
  return (trainerSeed ^ Math.imul(turn, 0x45d9f3b)) & 0x7fffffff;
}

function speedOf(pokemon) {
  return Number(pokemon?.stats?.SPEED ?? pokemon?.stats?.speed ?? 0);
}

function restoreMoveOrder(foe, originalIds) {
  if (!foe || !Array.isArray(foe.moves)) return;
  const buckets = new Map();
  for (const move of foe.moves) {
    const id = moveId(move);
    const bucket = buckets.get(id) ?? [];
    bucket.push(move);
    buckets.set(id, bucket);
  }
  const restored = [];
  for (const id of originalIds) {
    const bucket = buckets.get(id);
    if (bucket?.length) restored.push(bucket.shift());
  }
  for (const bucket of buckets.values()) restored.push(...bucket);
  if (restored.length === foe.moves.length) foe.moves = restored;
}

// Normal wild/trainer battles already choose the opponent move once in
// safari-playable-integration-pre-wounded.js. Boundary battles bypass that
// layer, so only they need this small compatibility chooser here.
function prepareBoundaryTrainerMove(runtime) {
  const battle = stateOf(runtime).battle;
  if (!battle || battle.completed || battle.kind !== "trainer" || battle.origin !== "boundary_trial") {
    return null;
  }
  const player = runtime.player?.party?.[0];
  if (!player) throw new Error("active player Pokemon is required for trainer AI");
  const originalMoves = [...(battle.foe?.moves ?? [])];
  const originalIds = originalMoves.map(moveId);
  const usable = originalMoves
    .map((move, moveIndex) => ({ move, moveIndex, id: moveId(move) }))
    .filter(({ move, id }) => id && SAFARI_MOVE_MASTERS[id] && (typeof move === "string" || Number(move.pp ?? 0) > 0));

  if (!usable.length) {
    const allOut = originalMoves.length > 0
      && originalMoves.every((move) => typeof move !== "string" && Number(move?.pp ?? 0) <= 0);
    if (!allOut) throw new Error("trainer AI has no usable projected move");
    return {
      trainerPartyIndex: battle.trainer_party_index,
      foeSpecies: battle.foe.species,
      originalIds,
      resolution: {
        command: "struggle",
        reason: "all_moves_out_of_pp",
        choices: [],
        weightedChoices: [],
        randomRolls: [],
      },
      selectedMoveId: "STRUGGLE",
    };
  }

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
  if (resolution.command !== "move" || !Number.isInteger(resolution.moveIndex)) {
    throw new Error(`trainer AI command is not connected to Safari round execution: ${resolution.command}`);
  }
  const selected = originalMoves[resolution.moveIndex];
  if (!selected) throw new RangeError("trainer AI selected an invalid move index");
  battle.foe.moves = [selected, ...originalMoves.filter((_, index) => index !== resolution.moveIndex)];
  return {
    trainerPartyIndex: battle.trainer_party_index,
    foeSpecies: battle.foe.species,
    originalIds,
    resolution,
    selectedMoveId: moveId(selected),
  };
}

function trainerAiCompatibility(result, battleKind, preparedBoundary) {
  if (preparedBoundary) {
    return {
      selectedMoveId: preparedBoundary.selectedMoveId,
      command: preparedBoundary.resolution.command,
      reason: preparedBoundary.resolution.reason,
      choices: preparedBoundary.resolution.choices,
      weightedChoices: preparedBoundary.resolution.weightedChoices,
      randomRolls: preparedBoundary.resolution.randomRolls,
    };
  }
  if (battleKind !== "trainer" || !result?.opponentChoice) return null;
  const choice = result.opponentChoice;
  return {
    ...choice,
    selectedMoveId: choice.command === "struggle" ? "STRUGGLE" : choice.selectedMoveId,
  };
}

function notifySafariRuntimeChanged() {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") return;
  queueMicrotask(() => window.dispatchEvent(new CustomEvent("safari-runtime-changed")));
}

function finalizeSafariRoundPresentation(result) {
  const stabilized = stabilizeSafariKoPresentation(result);
  notifySafariRuntimeChanged();
  return stabilized;
}

function finishRound(runtime, result, battleKind, preparedBoundary) {
  if (preparedBoundary) {
    const currentBattle = stateOf(runtime).battle;
    if (currentBattle
      && currentBattle.kind === "trainer"
      && currentBattle.trainer_party_index === preparedBoundary.trainerPartyIndex
      && currentBattle.foe?.species === preparedBoundary.foeSpecies) {
      restoreMoveOrder(currentBattle.foe, preparedBoundary.originalIds);
    }
  }
  const trainerAi = trainerAiCompatibility(result, battleKind, preparedBoundary);
  return trainerAi ? { ...result, trainerAi } : result;
}

export function resolveSafariBattleRound(runtime, selectedMoveId) {
  const battle = stateOf(runtime).battle;
  if (battleNeedsGeneralData(battle) && !safariGeneralDataReady()) {
    return ensureSafariGeneralData().then(() => resolveSafariBattleRound(runtime, selectedMoveId));
  }
  const battleKind = battle?.kind ?? null;
  const preparedBoundary = prepareBoundaryTrainerMove(runtime);
  const result = playable.resolveSafariBattleRound(runtime, selectedMoveId);
  const finalize = (resolved) => finishRound(
    runtime,
    finalizeSafariRoundPresentation(resolved),
    battleKind,
    preparedBoundary,
  );
  if (result && typeof result.then === "function") {
    return result.then(finalize);
  }
  return finalize(result);
}
