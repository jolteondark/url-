import { SAFARI_MOVE_PRESENTATION } from "./safari-move-presentation-live.js";
import { replaceSafariNormalBattlePlayer, resolveSafariNormalBattleRound } from "./safari-normal-battle-round.js";
import { prepareSafariNormalPlayerReplacement } from "./safari-central-player-replacement.js";
import { commitBrowserTrainerFoeReplacement } from "./browser-trainer-battle-round-runtime.js";
import { resetBattleStatStagesForBattlerCanonical } from "./battle-core-stat-stages.js";
import {
  attemptSafariCapture as attemptSafariNormalCapture,
  commitSafariCapturedWildRewardGrowth,
  returnSafariToDayBoard as returnSafariNormalToDayBoard,
  useSafariNormalBattleItem,
} from "./safari-normal-battle-lifecycle.js";
import { commitSafariNormalLevelEvolutionRewardGrowth, commitSafariNormalTerminalRewardGrowth } from "./safari-normal-battle-finalize.js";
import { commitSafariNormalExpRewardGrowth } from "./safari-normal-battle-exp-reward-growth.js";
import {
  abortSafariBattleCommand,
  abortSafariBattleReturn,
  beginSafariBattleCommand,
  beginSafariBattleReturn,
  captureSafariBattleCommandAttempt,
  captureSafariBattleReplacementCommit,
  commitSafariBattleResolution,
  completeSafariBattleReplacement,
  completeSafariBattleReturn,
  ensureSafariBattleOrchestrator,
} from "./safari-battle-orchestrator.js";
import { depositSafariPartyPokemon as depositSafariPartyPokemonOwner, withdrawSafariStoragePokemon as withdrawSafariStoragePokemonOwner } from "./safari-party-storage-actions.js";
import { activateSafariWebCombatCell } from "./safari-web-combat-start.js";
import {
  boardCellPresentation as startupBoardCellPresentation,
  clearSafariPlayableRun,
  createSafariPlayableRuntime,
  hasSafariPlayableRun,
  loadSafariPlayableRun,
  saveSafariPlayableRun,
} from "./safari-web-startup.js";

export { SAFARI_MOVE_PRESENTATION, clearSafariPlayableRun, createSafariPlayableRuntime, hasSafariPlayableRun, loadSafariPlayableRun, saveSafariPlayableRun };

let fullModule = null;
let fullModulePromise = null;
let carryoverModulePromise = null;

function rememberImportFailure(error) {
  globalThis.__maplessBattleRuntimeError = error;
  globalThis.__maplessLastError = error;
  throw error;
}

async function full() {
  if (fullModule) return fullModule;
  if (!fullModulePromise) {
    fullModulePromise = import("./safari-playable-integration.js")
      .then((module) => {
        fullModule = module;
        globalThis.__maplessBattleRuntimeError = null;
        return module;
      })
      .catch((error) => {
        fullModulePromise = null;
        return rememberImportFailure(error);
      });
  }
  return fullModulePromise;
}

async function carryover() {
  if (!carryoverModulePromise) {
    carryoverModulePromise = import("./mapless-carryover-next-run.js").catch((error) => {
      carryoverModulePromise = null;
      globalThis.__maplessLastError = error;
      throw error;
    });
  }
  return carryoverModulePromise;
}

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}

function needsFullBattleIntegration(runtime) {
  return stateOf(runtime).battle?.origin === "boundary_trial";
}

function publishRuntimeChanged() {
  if (typeof globalThis.CustomEvent !== "function") return;
  globalThis.window?.dispatchEvent?.(new CustomEvent("safari-runtime-changed"));
}

function beginNormalBattleCommand(runtime, kind) {
  if (!stateOf(runtime).battle || needsFullBattleIntegration(runtime)) return null;
  beginSafariBattleCommand(runtime, kind);
  return captureSafariBattleCommandAttempt(runtime);
}

function commitNormalRewardGrowth(runtime, current) {
  let committed = commitSafariNormalExpRewardGrowth(runtime, current);
  committed = commitSafariNormalTerminalRewardGrowth(runtime, committed);
  return committed;
}

function commitNormalTrainerReplacement(runtime, current) {
  if (!current?.foeReplacementRequired || !current?.trainerReplacementCommitInput) return current;
  const committed = commitBrowserTrainerFoeReplacement(current);
  const state = stateOf(runtime);
  const battle = state.battle;
  if (!battle || battle.kind !== "trainer") throw new Error("active trainer battle is required for replacement commit");
  const next = committed.nextRoundState ?? {};

  if (Array.isArray(next.foeParty)) battle.trainer_party = structuredClone(next.foeParty);
  battle.trainer_party_index = Number(next.foeActivePartyIndex ?? battle.trainer_party_index ?? 0);
  battle.trainer_party_order = structuredClone(next.partyOrder ?? battle.trainer_party_order ?? null);
  battle.foe = structuredClone(committed.foe);
  battle.decision = Number(next.decision ?? committed.decision ?? 0);
  battle.stat_stages = resetBattleStatStagesForBattlerCanonical(battle.stat_stages, 1);

  const battleTurn = Math.max(1, Number(battle.turn ?? 1) - 1);
  const switchOperations = (committed.foeReplacementOperations ?? []).map((operation) => ({
    ...structuredClone(operation),
    battleTurn,
  }));
  battle.last_operations = [...(battle.last_operations ?? current.operations ?? []), ...switchOperations];
  state.last_operations = structuredClone(battle.last_operations);

  const trainerName = battle.trainer?.trainer_full_name ?? "トレーナー";
  const trainerNext = {
    type: "trainer_next",
    actor: "foe",
    trainer: trainerName,
    species: battle.foe?.species ?? null,
    partyIndex: battle.trainer_party_index,
  };
  battle.presentation = [...(battle.presentation ?? current.presentation ?? []), trainerNext];
  state.notice = `${trainerName}は${battle.foe?.species ?? "次のポケモン"}を繰り出した！`;

  committed.operations = structuredClone(battle.last_operations);
  committed.presentation = structuredClone(battle.presentation);
  committed.foeReplacementRequired = false;
  return committed;
}

function commitNormalBattleCommand(runtime, result, kind, commandAttempt = null) {
  if (!stateOf(runtime).battle || needsFullBattleIntegration(runtime)) return result;
  return commitSafariBattleResolution(runtime, result, kind, {
    commandAttempt,
    replacementCommit: (current) => commitNormalTrainerReplacement(runtime, current),
    rewardGrowthCommit: (current) => commitNormalRewardGrowth(runtime, current),
  });
}

export function boardCellPresentation(runtime, index) {
  return fullModule ? fullModule.boardCellPresentation(runtime, index) : startupBoardCellPresentation(runtime, index);
}

export async function listSafariCarryoverCandidates(runtime) {
  return (await carryover()).listSafariCarryoverCandidates(runtime);
}

export async function prepareSafariNextRun(runtime, selection = null) {
  const result = await (await carryover()).prepareSafariNextRun(runtime, selection);
  globalThis.__maplessSafariRuntime = runtime;
  publishRuntimeChanged();
  return result;
}

export async function activateSafariDayBoardCell(runtime, index) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (event?.kind === "wild" || event?.kind === "trainer") {
    try {
      const result = await activateSafariWebCombatCell(runtime, index);
      if (stateOf(runtime).battle && !needsFullBattleIntegration(runtime)) ensureSafariBattleOrchestrator(runtime);
      return result;
    } catch (error) {
      globalThis.__maplessLastError = error;
      throw error;
    }
  }
  return (await full()).activateSafariDayBoardCell(runtime, index);
}

export async function prepareSafariBattleRuntime(runtime = globalThis.__maplessSafariRuntime) {
  if (!runtime?.variables?.mapless?.battle) return false;
  if (needsFullBattleIntegration(runtime)) await full();
  else ensureSafariBattleOrchestrator(runtime);
  return true;
}

export async function resolveSafariBattleRound(runtime, selectedMoveId) {
  const normal = !needsFullBattleIntegration(runtime);
  const commandAttempt = normal ? beginNormalBattleCommand(runtime, "move") : null;
  try {
    let result = normal
      ? resolveSafariNormalBattleRound(runtime, selectedMoveId)
      : await (await full()).resolveSafariBattleRound(runtime, selectedMoveId);
    if (normal && stateOf(runtime).battle) result = commitNormalBattleCommand(runtime, result, "move", commandAttempt);
    publishRuntimeChanged();
    return result;
  } catch (error) {
    if (normal) abortSafariBattleCommand(runtime, `move failed:${error?.message ?? error}`, { commandAttempt });
    throw error;
  }
}

export async function replaceSafariBattlePlayer(runtime, replacementPartyIndex, { replacementCommitToken = null } = {}) {
  let result;
  if (needsFullBattleIntegration(runtime)) {
    const module = await full();
    if (typeof module.replaceSafariBattlePlayer !== "function") throw new Error("boundary player replacement owner is unavailable");
    result = await module.replaceSafariBattlePlayer(runtime, replacementPartyIndex, { replacementCommitToken });
  } else {
    const commitToken = replacementCommitToken ?? captureSafariBattleReplacementCommit(runtime, "player");
    result = prepareSafariNormalPlayerReplacement(runtime, replacementPartyIndex);
    if (result.result === "replacement_selected") {
      result = completeSafariBattleReplacement(runtime, result, {
        replacementCommitToken: commitToken,
        replacementCommit: (current) => {
          const committed = replaceSafariNormalBattlePlayer(runtime, replacementPartyIndex);
          return {
            ...current,
            ...committed,
            playerReplacementRequired: false,
            playerReplacementApplied: true,
          };
        },
        rewardGrowthCommit: (current) => commitSafariNormalExpRewardGrowth(runtime, current),
      });
    }
  }
  publishRuntimeChanged();
  return result;
}

export async function useSafariBattleItem(runtime, options = {}) {
  if (needsFullBattleIntegration(runtime)) throw new Error("boundary battle item owner is unavailable");
  const commandAttempt = beginNormalBattleCommand(runtime, "item");
  try {
    let result = useSafariNormalBattleItem(runtime, options);
    if (stateOf(runtime).battle) result = commitNormalBattleCommand(runtime, result, "item", commandAttempt);
    publishRuntimeChanged();
    return result;
  } catch (error) {
    abortSafariBattleCommand(runtime, `item failed:${error?.message ?? error}`, { commandAttempt });
    throw error;
  }
}

export async function attemptSafariCapture(runtime, options = {}) {
  if (needsFullBattleIntegration(runtime)) return (await full()).attemptSafariCapture(runtime, options);
  if (stateOf(runtime).battle) {
    const commandAttempt = beginNormalBattleCommand(runtime, "capture");
    try {
      let result = attemptSafariNormalCapture(runtime, options);
      if (stateOf(runtime).battle) {
        result = commitSafariBattleResolution(runtime, result, "capture", {
          commandAttempt,
          rewardGrowthCommit: (current) => {
            let committed = current;
            if (result?.result === "caught") committed = commitSafariCapturedWildRewardGrowth(runtime, committed);
            return commitSafariNormalLevelEvolutionRewardGrowth(runtime, committed);
          },
        });
      }
      publishRuntimeChanged();
      return result;
    } catch (error) {
      abortSafariBattleCommand(runtime, `capture failed:${error?.message ?? error}`, { commandAttempt });
      throw error;
    }
  }
  return (await full()).attemptSafariCapture(runtime, options);
}

export async function returnSafariToDayBoard(runtime) {
  const wasBoundary = needsFullBattleIntegration(runtime);
  const normalBattleReturn = !wasBoundary && Boolean(stateOf(runtime).battle);
  if (normalBattleReturn) beginSafariBattleReturn(runtime);
  let result;
  try {
    if (wasBoundary) {
      result = await (await full()).returnSafariToDayBoard(runtime);
    } else if (stateOf(runtime).battle) {
      result = await returnSafariNormalToDayBoard(runtime);
    } else {
      result = await (await full()).returnSafariToDayBoard(runtime);
    }
  } catch (error) {
    if (normalBattleReturn) abortSafariBattleReturn(runtime, `return failed:${error?.message ?? error}`);
    throw error;
  }
  if (normalBattleReturn) completeSafariBattleReturn(runtime, result);
  globalThis.__maplessSafariRuntime = runtime;
  publishRuntimeChanged();
  return result;
}

export function depositSafariPartyPokemon(runtime, partyIndex, options = {}) {
  const result = depositSafariPartyPokemonOwner(runtime, partyIndex, options);
  globalThis.__maplessSafariRuntime = runtime;
  publishRuntimeChanged();
  return result;
}

export function withdrawSafariStoragePokemon(runtime, boxIndex, slotIndex) {
  const result = withdrawSafariStoragePokemonOwner(runtime, boxIndex, slotIndex);
  globalThis.__maplessSafariRuntime = runtime;
  publishRuntimeChanged();
  return result;
}

export async function enterSafariVillage(runtime) { return (await full()).enterSafariVillage(runtime); }
export async function leaveSafariVillage(runtime) { return (await full()).leaveSafariVillage(runtime); }