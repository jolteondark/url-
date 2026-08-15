export function buildBattleRuleCleanupPlan(gameTempPresent) {
  if (typeof gameTempPresent !== "boolean") {
    throw new Error("gameTempPresent must be boolean");
  }
  return gameTempPresent ? [{ op: "clear_battle_rules" }] : [];
}
