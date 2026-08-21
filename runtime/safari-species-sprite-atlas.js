import {
  SAFARI_SPECIES_FORM_FRONT_ATLAS,
  applySafariSpeciesFormFrontSprite,
  resolveSafariSpeciesFormFrontSprite,
} from "./safari-species-form-front-atlas.js";

// Compatibility surface for callers that still request a species-only fallback.
// The deleted general-front12 bundle is intentionally not restored: the active
// Safari fallback is the canonical species/form atlas backed by front.webp.
export const SAFARI_GENERAL_SPRITE_ATLAS = Object.freeze({
  speciesCount: SAFARI_SPECIES_FORM_FRONT_ATLAS.recordCount,
  columns: SAFARI_SPECIES_FORM_FRONT_ATLAS.columns,
  rows: SAFARI_SPECIES_FORM_FRONT_ATLAS.rows,
  cellSize: SAFARI_SPECIES_FORM_FRONT_ATLAS.cellSize,
  byteLength: SAFARI_SPECIES_FORM_FRONT_ATLAS.byteLength,
  sha256: SAFARI_SPECIES_FORM_FRONT_ATLAS.sha256,
});

export function resolveSafariSpeciesSprite(species) {
  return resolveSafariSpeciesFormFrontSprite(species, { form: 0 });
}

export function applySafariSpeciesSprite(element, species, { size = 48 } = {}) {
  const applied = applySafariSpeciesFormFrontSprite(element, species, {
    form: 0,
    family: "front",
    size,
  });
  if (!applied && element instanceof HTMLElement) {
    element.dataset.spriteFallback = "species-form-atlas-pending-or-missing";
  }
  return applied;
}
