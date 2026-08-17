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

  // GENERAL encounter file chunk 01. All three are canonical Day-1-eligible low-stage species.
  // This chunk intentionally publishes foe Front only. Player requests stay fail-closed instead of reusing Front/Icon art.
  "foe:PLUSLE:0": Object.freeze({
    species: "PLUSLE",
    side: "foe",
    form: 0,
    canonical_path: "Graphics/Pokemon/Front/PLUSLE.png",
    sha256: "4d93944d4d4fd19708537341c02896cfd530c9ba11859464cc3419e6afc2424a",
    src: "./assets/canonical-battle-sprites/front/PLUSLE.png",
  }),
  "foe:DRUDDIGON:0": Object.freeze({
    species: "DRUDDIGON",
    side: "foe",
    form: 0,
    canonical_path: "Graphics/Pokemon/Front/DRUDDIGON.png",
    sha256: "02a125e6123dacdfb17389f2978eaa179c44c28165e0f00ac30e42362b4bfda6",
    src: "./assets/canonical-battle-sprites/front/DRUDDIGON.png",
  }),
  "foe:MAWILE:0": Object.freeze({
    species: "MAWILE",
    side: "foe",
    form: 0,
    canonical_path: "Graphics/Pokemon/Front/MAWILE.png",
    sha256: "9dfc01d9997e49b2f994d852d74c78e9e92b08c4f3b24beb1120f027732122fe",
    src: "./assets/canonical-battle-sprites/front/MAWILE.png",
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
