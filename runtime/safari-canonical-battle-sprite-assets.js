// File-backed canonical source-v0.9.108 battle sprites for Safari.
// Keep individual PNGs out of JS parsing; this table can grow without turning
// battle entry into one giant inline data-URL module.
const DATA = Object.freeze({
  "foe:DWEBBLE:0": Object.freeze({
    species: "DWEBBLE",
    side: "foe",
    form: 0,
    canonical_path: "Graphics/Pokemon/Front/DWEBBLE.png",
    sha256: "24948e44497556a3a0c36012e85c94d74ea5a8e0644ef18e366dc7ca395b518e",
    src: "./assets/canonical-battle-sprites/front/DWEBBLE.png",
  }),
  "player:DWEBBLE:0": Object.freeze({
    species: "DWEBBLE",
    side: "player",
    form: 0,
    canonical_path: "Graphics/Pokemon/Back/DWEBBLE.png",
    sha256: "7a146844573421dad53802c2ebbe71752d09c8e925276b064cd2abfe73840055",
    src: "./assets/canonical-battle-sprites/back/DWEBBLE.png",
  }),
});

export function resolveSafariCanonicalFileBattleSprite({ species, form = 0, side } = {}) {
  if (typeof species !== "string" || !species) return null;
  const normalizedSide = side === "player" ? "player" : "foe";
  const normalizedForm = Number(form) || 0;
  return DATA[`${normalizedSide}:${species}:${normalizedForm}`]
    ?? DATA[`${normalizedSide}:${species}:0`]
    ?? null;
}
