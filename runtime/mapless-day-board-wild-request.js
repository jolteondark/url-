export function buildWildEncounterRequest(day, event) {
  if (!event || event.kind !== "wild" || !event.type) {
    throw new Error("wild event with type is required");
  }
  const normalizedDay = Math.max(Number.isFinite(Number(day)) ? Math.trunc(Number(day)) : 0, 1);
  return {
    required_type: event.type,
    day: normalizedDay,
    enemy_rank: "NORMAL",
    extra_modifier: 0,
    use_variance: true
  };
}
