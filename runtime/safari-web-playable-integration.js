import { SAFARI_MOVE_PRESENTATION } from "./safari-move-presentation-live.js";
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
let normalRoundModule = null;
let normalRoundModulePromise = null;
let normalLifecycleModule = null;
let normalLifecycleModulePromise = null;

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

async function normalRound() {
  if (normalRoundModule) return normalRoundModule;
  if (!normalRoundModulePromise) {
    normalRoundModulePromise = import("./safari-normal-battle-round.js?v=20260818-0852")
      .then((module) => {
        normalRoundModule = module;
        globalThis.__maplessBattleRuntimeError = null;
        return module;
      })
      .catch((error) => {
        normalRoundModulePromise = null;
        return rememberImportFailure(error);
      });
  }
  return normalRoundModulePromise;
}

async function normalLifecycle() {
  if (normalLifecycleModule) return normalLifecycleModule;
  if (!normalLifecycleModulePromise) {
    normalLifecycleModulePromise = import("./safari-normal-battle-lifecycle.js?v=20260818-0937")
      .then((module) => {
        normalLifecycleModule = module;
        globalThis.__maplessBattleRuntimeError = null;
        return module;
      })
      .catch((error) => {
        normalLifecycleModulePromise = null;
        return rememberImportFailure(error);
      });
  }
  return normalLifecycleModulePromise;
}

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}

function needsFullBattleIntegration(runtime) {
  return stateOf(runtime).battle?.origin === "boundary_trial";
}

export function boardCellPresentation(runtime, index) {
  return fullModule ? fullModule.boardCellPresentation(runtime, index) : startupBoardCellPresentation(runtime, index);
}

export async function activateSafariDayBoardCell(runtime, index) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (event?.kind === "wild" || event?.kind === "trainer") {
    try {
      const { activateSafariWebCombatCell } = await import("./safari-web-combat-start.js");
      return await activateSafariWebCombatCell(runtime, index);
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
  else await normalRound();
  return true;
}

export async function resolveSafariBattleRound(runtime, selectedMoveId) {
  if (needsFullBattleIntegration(runtime)) return (await full()).resolveSafariBattleRound(runtime, selectedMoveId);
  return (await normalRound()).resolveSafariNormalBattleRound(runtime, selectedMoveId);
}
export async function attemptSafariCapture(runtime) {
  if (needsFullBattleIntegration(runtime)) return (await full()).attemptSafariCapture(runtime);
  if (stateOf(runtime).battle) return (await normalLifecycle()).attemptSafariCapture(runtime);
  return (await full()).attemptSafariCapture(runtime);
}
export async function returnSafariToDayBoard(runtime) {
  if (needsFullBattleIntegration(runtime)) return (await full()).returnSafariToDayBoard(runtime);
  if (stateOf(runtime).battle) return (await normalLifecycle()).returnSafariToDayBoard(runtime);
  return (await full()).returnSafariToDayBoard(runtime);
}
export async function enterSafariVillage(runtime) {
  return (await full()).enterSafariVillage(runtime);
}
export async function leaveSafariVillage(runtime) {
  return (await full()).leaveSafariVillage(runtime);
}
export async function leaveSafariShop(runtime) {
  return (await full()).leaveSafariShop(runtime);
}
export async function purchaseSafariShopItem(runtime, input) {
  return (await full()).purchaseSafariShopItem(runtime, input);
}
export async function acceptSafariVillageBounty(runtime, input) {
  return (await full()).acceptSafariVillageBounty(runtime, input);
}
export async function startSafariVillageBounty(runtime) {
  return (await full()).startSafariVillageBounty(runtime);
}
export async function setSafariPartyLead(runtime, index) {
  return (await full()).setSafariPartyLead(runtime, index);
}

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

export function safariFullIntegrationLoaded() {
  return fullModule !== null;
}
