export function resolveMaplessPokemonCenterHealing({ player } = {}) {
  if (!player || typeof player !== "object" || Array.isArray(player) || !Array.isArray(player.party)) {
    return {
      healed: false,
      result: "center_unavailable",
      requestSave: false,
      operations: [{ op: "heal_party", facility: "center", result: false }],
    };
  }

  const stats = player.stats && typeof player.stats === "object" && !Array.isArray(player.stats)
    ? player.stats
    : {};
  player.stats = stats;
  stats.poke_center_count = Math.max(0, Math.trunc(Number(stats.poke_center_count ?? 0))) + 1;

  return {
    healed: true,
    result: "center_healed",
    requestSave: true,
    operations: [
      { op: "heal_party", facility: "center", result: true, restoreHp: true, clearStatus: true, restorePp: true },
      { op: "increment_stat", stat: "pokemon_center_used", canonicalStat: "poke_center_count", amount: 1, value: stats.poke_center_count },
      { op: "request_save", reason: "pokemon_center_healed" },
    ],
  };
}
