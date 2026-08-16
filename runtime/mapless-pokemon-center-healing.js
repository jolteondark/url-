export function resolveMaplessPokemonCenterHealing({ player } = {}) {
  if (!player || typeof player !== "object" || Array.isArray(player) || !Array.isArray(player.party)) {
    return {
      healed: false,
      result: "center_unavailable",
      requestSave: false,
      operations: [{ op: "heal_party", facility: "center", result: false }],
    };
  }

  return {
    healed: true,
    result: "center_healed",
    requestSave: true,
    operations: [
      { op: "heal_party", facility: "center", result: true, restoreHp: true, clearStatus: true, restorePp: true },
      { op: "increment_stat", stat: "pokemon_center_used", amount: 1 },
    ],
  };
}
