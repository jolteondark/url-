// Generated browser subset of private M0324. Contains only the current Day 1 Safari vertical-slice sprite contract.
// Raw canonical graphics are not embedded here.
export const SAFARI_BATTLE_SPRITE_ASSET_ROWS = Object.freeze([
  Object.freeze({ species: "EEVEE", form: 0, side: "player", canonical_path: "Graphics/Pokemon/Back/EEVEE.png", size: 3050, sha256: "d2fe616b91238392214b081a6e03f2cd35ddc7026c3cab74c09ed47b6c6e7b06", offset_x: 0, offset_y: 96, shadow_size: 1, shows_shadow: true, metrics_id: "EEVEE" }),
  Object.freeze({ species: "PINSIR", form: 0, side: "foe", canonical_path: "Graphics/Pokemon/Front/PINSIR.png", size: 3132, sha256: "01d3830ffed4c3a09fe9b98cc9404b953af0169206c408f735a8f49287b87959", offset_x: 12, offset_y: 48, shadow_size: 2, shows_shadow: true, metrics_id: "PINSIR" }),
  Object.freeze({ species: "BOMBIRDIER", form: 0, side: "foe", canonical_path: "Graphics/Pokemon/Front/BOMBIRDIER.png", size: 3979, sha256: "63fd7fa26177279552dca371730260fa11b07b0ebf95819b0384eb221b4ec506", offset_x: -8, offset_y: -24, shadow_size: 2, shows_shadow: true, metrics_id: "BOMBIRDIER" }),
  Object.freeze({ species: "RATTATA", form: 0, side: "foe", canonical_path: "Graphics/Pokemon/Front/RATTATA.png", size: 1433, sha256: "c939dd58480f0ba82f8e9f868cc8b3f092a86dff29aa96d2cc06298f9d34d011", offset_x: 0, offset_y: 72, shadow_size: 1, shows_shadow: true, metrics_id: "RATTATA" }),
]);

const BY_KEY = new Map(SAFARI_BATTLE_SPRITE_ASSET_ROWS.map((row) => [`${row.side}:${row.species}:${row.form}`, row]));

export function resolveSafariBattleSpriteAsset({ species, form = 0, battlerIndex = 1 } = {}) {
  if (typeof species !== "string" || !species) return null;
  if (!Number.isInteger(form) || !Number.isInteger(battlerIndex) || battlerIndex < 0) return null;
  const side = (battlerIndex & 1) === 0 ? "player" : "foe";
  const row = BY_KEY.get(`${side}:${species}:${form}`);
  return row ? { ...row } : null;
}
