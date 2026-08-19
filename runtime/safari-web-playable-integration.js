import { SAFARI_MOVE_PRESENTATION } from "./safari-move-presentation-live.js";
import { replaceSafariNormalBattlePlayer, resolveSafariNormalBattleRound } from "./safari-normal-battle-round.js";
import {
  attemptSafariCapture as attemptSafariNormalCapture,
  commitSafariCapturedWildRewardGrowth,
  returnSafariToDayBoard as returnSafariNormalToDayBoard,
  useSafariNormalBattleItem,
} from "./safari-normal-battle-lifecycle.js";
import { commitSafariNormalLevelEvolutionRewardGrowth, commitSafariNormalTerminalRewardGrowth } from "./safari-normal-battle-finalize.js";
import {
  abortSafariBattleCommand,
  abortSafariBattleReturn,
  beginSafariBattleCommand,
  beginSafariBattleReturn,
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
  if (!stateOf(runtime).battle || needsFullBattleIntegration(runtime)) return false;
  beginSafariBattleCommand(runtime, kind);
  return true;
}

function commitNormalBattleCommand(runtime, result, kind) {
  if (!stateOf(runtime).battle || needsFullBattleIntegration(runtime)) return result;
  return commitSafariBattleResolution(runtime, result, kind, {
    rewardGrowthCommit: (current) => commitSafariNormalTerminalRewardGrowth(runtime, current),
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
  if (normal) beginSafariBattleCommand(runtime, "move");
  try {
    const result = normal
      ? resolveSafariNormalBattleRound(runtime, selectedMoveId)
      : await (await full()).resolveSafariBattleRound(runtime, selectedMoveId);
    if (normal && stateOf(runtime).battle) commitNormalBattleCommand(runtime, result, "move");
    publishRuntimeChanged();
    return result;
  } catch (error) {
    if (normal) abortSafariBattleCommand(runtime, `move failed:${error?.message ?? error}`);
    throw error;
  }
}

export async function replaceSafariBattlePlayer(runtime, replacementPartyIndex) {
  let result;
  if (needsFullBattleIntegration(runtime)) {
    const module = await full();
    if (typeof module.replaceSafariBattlePlayer !== "function") throw new Error("boundary player replacement owner is unavailable");
    result = await module.replaceSafariBattlePlayer(runtime, replacementPartyIndex);
  } else {
    result = replaceSafariNormalBattlePlayer(runtime, replacementPartyIndex);
    completeSafariBattleReplacement(runtime, result);
  }
  publishRuntimeChanged();
  return result;
}

export async function useSafariBattleItem(runtime, options = {}) {
  if (needsFullBattleIntegration(runtime)) throw new Error("boundary battle item owner is unavailable");
  beginSafariBattleCommand(runtime, "item");
  try {
    const result = useSafariNormalBattleItem(runtime, options);
    if (stateOf(runtime).battle) commitNormalBattleCommand(runtime, result, "item");
    publishRuntimeChanged();
    return result;
  } catch (error) {
    abortSafariBattleCommand(runtime, `item failed:${error?.message ?? error}`);
    throw error;
  }
}

export async function attemptSafariCapture(runtime, options = {}) {
  if (needsFullBattleIntegration(runtime)) return (await full()).attemptSafariCapture(runtime, options);
  if (stateOf(runtime).battle) {
    beginSafariBattleCommand(runtime, "capture");
    try {
      const result = attemptSafariNormalCapture(runtime, options);
      if (stateOf(runtime).battle) {
        commitSafariBattleResolution(runtime, result, "capture", {
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
      abortSafariBattleCommand(runtime, `capture failed:${error?.message ?? error}`);
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
  if (wasBoundary && result?.target === "day_board") {
    const requestSave = { op: "request_save", reason: "boundary return committed" };
    result.operations = [...(result.operations ?? []), requestSave];
    result.persistenceRequested = true;
    stateOf(runtime).last_operations = result.operations;
  }
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
export async function leaveSafariShop(runtime) { return (await full()).leaveSafariShop(runtime); }
export async function purchaseSafariShopItem(runtime, input) { return (await full()).purchaseSafariShopItem(runtime, input); }
export async function acceptSafariVillageBounty(runtime, input) { return (await full()).acceptSafariVillageBounty(runtime, input); }
export async function startSafariVillageBounty(runtime) { return (await full()).startSafariVillageBounty(runtime); }
export async function setSafariPartyLead(runtime, index) { return (await full()).setSafariPartyLead(runtime, index); }

export function safariShopPresentation(runtime) {
  if (fullModule) return fullModule.safariShopPresentation(runtime);
  return null;
}

export function safariVillagePresentation(runtime) {
  if (fullModule) return fullModule.safariVillagePresentation(runtime);
  const state = stateOf(runtime);
  const village = state.village ?? {};
  const quest = village.active_bounty ?? village.bounties?.[0] ?? null;
  return {
    active: state.location === "village",
    actionsLeft: Number(village.actions_left ?? 0),
    actionLimit: Number(village.action_limit ?? 3),
    boardLocked: Boolean(village.bounty_board_locked),
    hasActiveBounty: Boolean(village.active_bounty),
    ablePokemonCount: (runtime.player?.party ?? []).filter((pokemon) => Number(pokemon?.hp ?? 0) > 0).length,
    quest: quest == null ? null : {
      species: quest.species,
      speciesName: quest.species_name ?? quest.species,
      prefix: quest.prefix ?? null,
      level: Number(quest.level ?? 0),
      reward: Number(quest.reward ?? 0),
    },
  };
}

export function safariFullIntegrationLoaded() { return fullModule !== null; }
