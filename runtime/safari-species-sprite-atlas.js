import c0 from "../assets/general-front12/front-00.js";
import c1 from "../assets/general-front12/front-01.js";
import c2 from "../assets/general-front12/front-02.js";
import c3 from "../assets/general-front12/front-03.js";
import c4 from "../assets/general-front12/front-04.js";
import c5 from "../assets/general-front12/front-05.js";
import { SAFARI_GENERAL_SPRITE_SPECIES } from "./safari-species-sprite-manifest.js";

export const SAFARI_GENERAL_SPRITE_ATLAS = Object.freeze({
  speciesCount: 875,
  columns: 30,
  rows: 30,
  cellSize: 12,
  byteLength: 70592,
  sha256: "54b813b01a47cb14e5564608bb8fa246b07ab984d6c0e0afd7ee253507a38a4d",
});

// The first public atlas manifest predated the private canonical M0365 owner and
// carried one transcription typo (GHOLDENGOUL). The atlas pixel at that ordinal
// was generated from canonical GHOLDENGO. Canonicalize only that legacy manifest
// label while preserving atlas order/bytes.
function canonicalSpeciesId(species) {
  return species === "GHOLDENGOUL" ? "GHOLDENGO" : species;
}

const INDEX = new Map(SAFARI_GENERAL_SPRITE_SPECIES.map((species, index) => [canonicalSpeciesId(species), index]));
let objectUrl = null;

function decodeAtlas() {
  if (objectUrl) return objectUrl;
  const encoded = c0 + c1 + c2 + c3 + c4 + c5;
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  objectUrl = URL.createObjectURL(new Blob([bytes], { type: "image/webp" }));
  return objectUrl;
}

export function resolveSafariSpeciesSprite(species) {
  const canonical = canonicalSpeciesId(species);
  const index = INDEX.get(canonical);
  if (!Number.isInteger(index)) return null;
  return Object.freeze({
    species: canonical,
    index,
    column: index % SAFARI_GENERAL_SPRITE_ATLAS.columns,
    row: Math.floor(index / SAFARI_GENERAL_SPRITE_ATLAS.columns),
    url: decodeAtlas(),
  });
}

export function applySafariSpeciesSprite(element, species, { size = 48 } = {}) {
  if (!(element instanceof HTMLElement)) return false;
  const sprite = resolveSafariSpeciesSprite(species);
  if (!sprite) {
    element.dataset.spriteFallback = "missing-canonical-sprite";
    return false;
  }
  const columns = SAFARI_GENERAL_SPRITE_ATLAS.columns;
  const rows = SAFARI_GENERAL_SPRITE_ATLAS.rows;
  element.dataset.spriteSpecies = sprite.species;
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
