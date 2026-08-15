export function buildWildBattleLaunchPlan(index, encounter) {
  if (!Number.isInteger(index) || index < 0 || index > 7) {
    throw new Error("board index must be an integer from 0 to 7");
  }
  if (!encounter || typeof encounter !== "object" || Array.isArray(encounter)) {
    throw new Error("encounter object is required");
  }
  if (!encounter.species_id || !Number.isInteger(encounter.level)) {
    throw new Error("encounter species_id and integer level are required");
  }
  return [
    { op: "consume_cell", index, value: true },
    { op: "set_battle_rule", rule: "canLose" },
    {
      op: "start_wild_battle",
      species_id: encounter.species_id,
      level: encounter.level
    }
  ];
}
