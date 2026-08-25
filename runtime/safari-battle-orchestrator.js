import * as base from "./safari-battle-orchestrator-base.js";
import {
  consumeSafariPowerMealAfterBattle,
  ensureSafariPowerMealBattleOpening,
} from "./mapless-power-meal-runtime.js";

export * from "./safari-battle-orchestrator-base.js";

export function ensureSafariBattleOrchestrator(runtime) {
  ensureSafariPowerMealBattleOpening(runtime);
  return base.ensureSafariBattleOrchestrator(runtime);
}

export function beginSafariBattleCommand(runtime, commandKind = "move") {
  ensureSafariPowerMealBattleOpening(runtime);
  return base.beginSafariBattleCommand(runtime, commandKind);
}

export function commitSafariBattleResolution(runtime, result, commandKind = null, options = {}) {
  const committed = base.commitSafariBattleResolution(runtime, result, commandKind, options);
  consumeSafariPowerMealAfterBattle(runtime);
  return committed;
}
