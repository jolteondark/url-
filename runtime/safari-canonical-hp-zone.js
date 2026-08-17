export const SAFARI_CANONICAL_HP_ZONE_SOURCE = Object.freeze({
  canonicalPath: "Plugins/ZZZZZZ Mapless Expedition Rules/008_Mapless_Autosave_Summary_Fixes.rb",
  overlayPath: "Graphics/UI/Summary/overlay_hp",
  greenRow: 0,
  yellowRow: 1,
  redRow: 2,
});

export function resolveSafariCanonicalHpZone({ hp, maxHp } = {}) {
  const current = Math.max(0, Math.trunc(Number(hp ?? 0)));
  const total = Math.max(1, Math.trunc(Number(maxHp ?? 1)));
  if (current <= Math.floor(total / 4)) return 2;
  if (current <= Math.floor(total / 2)) return 1;
  return 0;
}
