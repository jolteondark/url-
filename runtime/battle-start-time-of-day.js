const CANONICAL_BATTLE_TIME_OF_DAY = Object.freeze(new Set(["DAY", "EVE", "NIGHT"]));

export function resolveCanonicalBattleStartTimeOfDay(now = new Date()) {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new TypeError("valid Battle start Date is required");
  }
  const hour = now.getHours();
  if (hour >= 20 || hour < 5) return "NIGHT";
  if (hour >= 17) return "EVE";
  return "DAY";
}

export function commitBattleStartTimeOfDayCanonical({ battle, now = new Date() } = {}) {
  if (!battle || typeof battle !== "object" || Array.isArray(battle)) {
    throw new TypeError("battle state is required");
  }
  if (Object.prototype.hasOwnProperty.call(battle, "timeOfDay")) {
    if (!CANONICAL_BATTLE_TIME_OF_DAY.has(battle.timeOfDay)) {
      throw new Error(`invalid existing Battle timeOfDay owner value: ${battle.timeOfDay}`);
    }
    return Object.freeze({ committed: false, reason: "already_committed", timeOfDay: battle.timeOfDay });
  }
  const timeOfDay = resolveCanonicalBattleStartTimeOfDay(now);
  battle.timeOfDay = timeOfDay;
  return Object.freeze({ committed: true, reason: "committed", timeOfDay });
}
