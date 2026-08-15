export function clampEncounterLevel(baseLevel, variance, minLevel, maxLevel) {
  for (const [name, value] of [
    ["baseLevel", baseLevel],
    ["variance", variance],
    ["minLevel", minLevel],
    ["maxLevel", maxLevel]
  ]) {
    if (!Number.isInteger(value)) {
      throw new Error(`${name} must be an integer`);
    }
  }
  if (minLevel > maxLevel) {
    throw new Error("minLevel must be <= maxLevel");
  }
  return Math.min(Math.max(baseLevel + variance, minLevel), maxLevel);
}
