const CANONICAL_BATTLEBACK_VARIANTS = Object.freeze({
  day: Object.freeze({
    background: "./assets/canonical-battlebacks/field_bg.png",
    playerBase: "./assets/canonical-battlebacks/field_base0.png",
    foeBase: "./assets/canonical-battlebacks/field_base1.png",
  }),
  eve: Object.freeze({
    background: "./assets/canonical-battlebacks/field_eve_bg.png",
    playerBase: "./assets/canonical-battlebacks/field_eve_base0.png",
    foeBase: "./assets/canonical-battlebacks/field_eve_base1.png",
  }),
  night: Object.freeze({
    background: "./assets/canonical-battlebacks/field_night_bg.png",
    playerBase: "./assets/canonical-battlebacks/field_night_base0.png",
    foeBase: "./assets/canonical-battlebacks/field_night_base1.png",
  }),
});

function canonicalBattlebackTimeIdentifier(value) {
  if (value === 1 || value === "1") return "eve";
  if (value === 2 || value === "2") return "night";
  const identifier = String(value ?? "day").trim().toLowerCase();
  if (identifier === "eve" || identifier === "evening") return "eve";
  if (identifier === "night") return "night";
  if (identifier === "day" || identifier === "daytime" || identifier === "0" || identifier === "") return "day";
  return null;
}

export function resolveCanonicalBattlebackAssets(timeOfDay = "day") {
  const identifier = canonicalBattlebackTimeIdentifier(timeOfDay);
  if (!identifier) return null;
  return CANONICAL_BATTLEBACK_VARIANTS[identifier] ?? null;
}

export function rememberCanonicalBattlebackDiagnostic(timeOfDay, state, detail = null) {
  const identifier = canonicalBattlebackTimeIdentifier(timeOfDay);
  globalThis.__maplessBattlebackDiagnostics = Object.freeze({
    timeOfDay: identifier,
    state,
    detail,
    assets: identifier ? CANONICAL_BATTLEBACK_VARIANTS[identifier] : null,
  });
  return globalThis.__maplessBattlebackDiagnostics;
}

export {
  CANONICAL_BATTLEBACK_VARIANTS,
  canonicalBattlebackTimeIdentifier,
};
