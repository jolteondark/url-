import k0 from "./species-form-front-keys-0.js";
import k1 from "./species-form-front-keys-1.js";
import k2 from "./species-form-front-keys-2.js";

export const SAFARI_SPECIES_FORM_FRONT_ATLAS = Object.freeze({
  recordCount: 1669,
  columns: 42,
  rows: 40,
  cellSize: 16,
  byteLength: 128192,
  sha256: "18d99449151b2ad602f997e1f77d06dbecbe64b718b5c5063b1f01cf30094ec0",
  exactCount: 1654,
  fallbackCount: 15,
  sourceGraphicsSha256: "2257ab3e4c42ce599932ed39577ade101d2e1e24afdbc0d6e5c03b609dcaa79a",
});

export const SAFARI_SPECIES_FORM_FRONT_KEYS = Object.freeze([...k0, ...k1, ...k2]);
if (SAFARI_SPECIES_FORM_FRONT_KEYS.length !== SAFARI_SPECIES_FORM_FRONT_ATLAS.recordCount) {
  throw new Error("Species/Form front atlas key count mismatch");
}
const INDEX = new Map(SAFARI_SPECIES_FORM_FRONT_KEYS.map((key, index) => [key, index]));
const ATLAS_URL = new URL("../assets/species-form/front.webp", import.meta.url).href;

export function resolveSafariSpeciesFormFrontSprite(species, { form = 0 } = {}) {
  const normalizedForm = Number(form) || 0;
  const key = normalizedForm > 0 ? `${species},${normalizedForm}` : String(species);
  const index = INDEX.get(key);
  if (!Number.isInteger(index)) return null;
  return Object.freeze({
    key,
    species: String(species),
    form: normalizedForm,
    index,
    column: index % SAFARI_SPECIES_FORM_FRONT_ATLAS.columns,
    row: Math.floor(index / SAFARI_SPECIES_FORM_FRONT_ATLAS.columns),
    url: ATLAS_URL,
  });
}

export function applySafariSpeciesFormFrontSprite(element, species, { form = 0, family = "front", size = 48 } = {}) {
  if (!(element instanceof HTMLElement)) return false;
  const sprite = resolveSafariSpeciesFormFrontSprite(species, { form });
  if (!sprite) return false;
  const { columns, rows } = SAFARI_SPECIES_FORM_FRONT_ATLAS;
  element.dataset.spriteSpecies = sprite.species;
  element.dataset.spriteForm = String(sprite.form);
  element.dataset.spriteFamily = family;
  element.dataset.spriteAtlasFamily = "front";
  delete element.dataset.spriteFallback;
  element.style.width = `${size}px`;
  element.style.height = `${size}px`;
  element.style.backgroundImage = `url("${sprite.url}")`;
  element.style.backgroundSize = `${columns * size}px ${rows * size}px`;
  element.style.backgroundPosition = `${-sprite.column * size}px ${-sprite.row * size}px`;
  element.style.backgroundRepeat = "no-repeat";
  element.style.imageRendering = "pixelated";
  return true;
}
