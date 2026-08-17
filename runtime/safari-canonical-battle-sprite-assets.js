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

  // GENERAL encounter file chunk 01.
  "foe:PLUSLE:0": Object.freeze({ species: "PLUSLE", side: "foe", form: 0, canonical_path: "Graphics/Pokemon/Front/PLUSLE.png", sha256: "4d93944d4d4fd19708537341c02896cfd530c9ba11859464cc3419e6afc2424a", src: "./assets/canonical-battle-sprites/front/PLUSLE.png" }),
  "foe:DRUDDIGON:0": Object.freeze({ species: "DRUDDIGON", side: "foe", form: 0, canonical_path: "Graphics/Pokemon/Front/DRUDDIGON.png", sha256: "02a125e6123dacdfb17389f2978eaa179c44c28165e0f00ac30e42362b4bfda6", src: "./assets/canonical-battle-sprites/front/DRUDDIGON.png" }),
  "foe:MAWILE:0": Object.freeze({ species: "MAWILE", side: "foe", form: 0, canonical_path: "Graphics/Pokemon/Front/MAWILE.png", sha256: "9dfc01d9997e49b2f994d852d74c78e9e92b08c4f3b24beb1120f027732122fe", src: "./assets/canonical-battle-sprites/front/MAWILE.png" }),

  // GENERAL encounter file chunk 02: Day-1-eligible representatives across six types.
  "foe:CATERPIE:0": Object.freeze({ species: "CATERPIE", side: "foe", form: 0, canonical_path: "Graphics/Pokemon/Front/CATERPIE.png", sha256: "ea82756c7454f6b90c575be85623e1b6ac1bf01009449f43487252c6d6d9f45b", src: "./assets/canonical-battle-sprites/front/CATERPIE.png" }),
  "foe:PICHU:0": Object.freeze({ species: "PICHU", side: "foe", form: 0, canonical_path: "Graphics/Pokemon/Front/PICHU.png", sha256: "15be29146c380ffbe830b54458604bb52bcba9452989623b543b6875d27d5266", src: "./assets/canonical-battle-sprites/front/PICHU.png" }),
  "foe:CHARMANDER:0": Object.freeze({ species: "CHARMANDER", side: "foe", form: 0, canonical_path: "Graphics/Pokemon/Front/CHARMANDER.png", sha256: "1ff9acd5fe6ea9c4bc51227c7ebb08a1adaf2685023ab9adf38ffd13fc1f537c", src: "./assets/canonical-battle-sprites/front/CHARMANDER.png" }),
  "foe:PIDGEY:0": Object.freeze({ species: "PIDGEY", side: "foe", form: 0, canonical_path: "Graphics/Pokemon/Front/PIDGEY.png", sha256: "e83d96ae291d432348ad65e038bcd6684ade6685623198694584405a3341371f", src: "./assets/canonical-battle-sprites/front/PIDGEY.png" }),
  "foe:RALTS:0": Object.freeze({ species: "RALTS", side: "foe", form: 0, canonical_path: "Graphics/Pokemon/Front/RALTS.png", sha256: "675c51f4a428db63adeb6e99d62c9e2381df9202442f9754418db65a19f51a6c", src: "./assets/canonical-battle-sprites/front/RALTS.png" }),
  "foe:GASTLY:0": Object.freeze({ species: "GASTLY", side: "foe", form: 0, canonical_path: "Graphics/Pokemon/Front/GASTLY.png", sha256: "5ac1b474a349a1ea5ae4acc83e2fc9e42aea31351e7098e4f571fbb42416f652", src: "./assets/canonical-battle-sprites/front/GASTLY.png" }),
});

export function resolveSafariCanonicalFileBattleSprite({ species, form = 0, side } = {}) {
  if (typeof species !== "string" || !species) return null;
  const normalizedSide = side === "player" ? "player" : "foe";
  const normalizedForm = Number(form) || 0;
  return DATA[`${normalizedSide}:${species}:${normalizedForm}`]
    ?? DATA[`${normalizedSide}:${species}:0`]
    ?? null;
}
