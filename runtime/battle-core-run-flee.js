import { RubyMT19937Random } from "./ruby-mt19937-random.js";

export const CAN_RUN_BODY_SHA256 = "e5b6978b3326ae47c191b0ee7bee96a1261d31b3655bf721fe6c62ae5e2a21a8";
export const RUN_BODY_SHA256 = "42279b03768821aa82c76381714f6f68c25827bffa9eeddbb3fe166b6004b0bf";

function anyTrap(input = {}) {
  return Boolean(input.trappedByOpponentAbility || input.trappedByOpponentItem);
}

export function canRunCanonical(input = {}) {
  if (input.trainerBattle) return false;
  if (!input.canRun && !input.battlerOpposes) return false;
  if (input.moreTypeEffects && input.battlerHasGhostType) return true;
  if (input.certainEscapeByAbility || input.certainEscapeByItem) return true;
  if (input.trappedInBattle || anyTrap(input)) return false;
  return true;
}

export function resolveRunCanonical(input = {}) {
  const battlerOpposes = Boolean(input.battlerOpposes);
  const trainerBattle = Boolean(input.trainerBattle);
  let runCommand = Number.isInteger(Number(input.runCommand)) ? Number(input.runCommand) : 0;
  const base = {
    result: 0,
    decision: Number(input.decision ?? 0),
    runCommand,
    rate: null,
    randomRoll: null,
    reason: null,
  };

  if (battlerOpposes) {
    if (trainerBattle) return { ...base, reason: "opponent_trainer_battle" };
    return {
      ...base,
      result: -1,
      reason: "opponent_run_choice",
      choice: { command: "Run", index: 0, target: null },
    };
  }

  const debugResult = Number(input.debugResult ?? 0);
  if (debugResult !== 0) {
    return {
      ...base,
      result: debugResult,
      decision: Number(input.debugDecision ?? base.decision),
      reason: "debug_result",
    };
  }

  if (trainerBattle) {
    if (!input.internalBattle && input.forfeitConfirmed) {
      return { ...base, result: 1, decision: 3, reason: "trainer_forfeit" };
    }
    return {
      ...base,
      reason: input.internalBattle ? "trainer_battle_cannot_run" : "trainer_forfeit_declined",
    };
  }
  if (!input.canRun) return { ...base, reason: "can_run_disabled" };

  if (!input.duringBattle) {
    if (input.moreTypeEffects && input.battlerHasGhostType) {
      return { ...base, result: 1, decision: 3, reason: "ghost_certain_escape" };
    }
    if (input.certainEscapeByAbility) {
      return { ...base, result: 1, decision: 3, reason: "ability_certain_escape" };
    }
    if (input.certainEscapeByItem) {
      return { ...base, result: 1, decision: 3, reason: "item_certain_escape" };
    }
    if (input.trappedInBattle) return { ...base, reason: "trapped_in_battle" };
    if (input.trappedByOpponentAbility) return { ...base, reason: "opponent_ability_trap" };
    if (input.trappedByOpponentItem) return { ...base, reason: "opponent_item_trap" };
  }

  if (!input.duringBattle) runCommand += 1;
  const speedPlayer = Number(input.speedPlayer ?? 0);
  const opponentSpeeds = Array.isArray(input.opponentSpeeds)
    ? input.opponentSpeeds.map(Number).filter(Number.isFinite)
    : [];
  const speedEnemy = Math.max(1, ...opponentSpeeds);
  const rate = speedPlayer > speedEnemy
    ? 256
    : Math.floor((speedPlayer * 128) / speedEnemy) + runCommand * 30;

  if (rate >= 256) {
    return { ...base, result: 1, decision: 3, runCommand, rate, reason: "speed_escape" };
  }

  let randomRoll = input.randomRoll;
  if (randomRoll === undefined || randomRoll === null) {
    if (input.runRandomSeed === undefined || input.runRandomSeed === null) {
      throw new Error("runRandomSeed or randomRoll is required when flee rate is below 256");
    }
    randomRoll = new RubyMT19937Random(Number(input.runRandomSeed) & 0x7fffffff).randInt(256);
  }
  randomRoll = Number(randomRoll);
  if (randomRoll < rate) {
    return { ...base, result: 1, decision: 3, runCommand, rate, randomRoll, reason: "random_escape" };
  }
  return { ...base, result: -1, runCommand, rate, randomRoll, reason: "escape_failed" };
}
