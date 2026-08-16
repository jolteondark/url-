import { applySafariSpeciesSprite } from "./safari-species-sprite-atlas.js";
import { applySafariSpeciesFormFrontSprite } from "./safari-species-form-front-atlas.js";

let manifest = null;
let index = null;

export function installSafariSpeciesSpriteManifest(value) {
  if (!value || value.schema !== "mapless.browser-species-sprite-manifest.v1" || !Array.isArray(value.records)) {
    throw new TypeError("browser species sprite manifest is required");
  }
  manifest = value;
  index = new Map(value.records.map((row) => [row.key, row]));
}

function manifestAsset(species, form, family) {
  if (!index) return null;
  const key = Number(form) > 0 ? `${species},${Number(form)}` : species;
  return index.get(key)?.assets?.[family] ?? null;
}

export function applySafariSpeciesSpriteWithManifest(element, species, { form = 0, family = "front", size = 48 } = {}) {
  if (!(element instanceof HTMLElement)) return false;
  const asset = manifestAsset(species, form, family);
  if (asset?.url) {
    element.dataset.spriteSpecies = String(species);
    element.dataset.spriteForm = String(Number(form) || 0);
    element.dataset.spriteFamily = family;
    element.dataset.spriteExactFormAsset = String(Boolean(asset.exact_form_asset));
    element.style.width = `${size}px`;
    element.style.height = `${size}px`;
    element.style.backgroundImage = `url("${asset.url}")`;
    element.style.backgroundSize = "contain";
    element.style.backgroundPosition = "center";
    element.style.backgroundRepeat = "no-repeat";
    element.style.imageRendering = "pixelated";
    return true;
  }
  element.dataset.spriteExactFormAsset = "false";
  if (applySafariSpeciesFormFrontSprite(element, species, { form, family, size })) return true;
  element.dataset.spriteForm = String(Number(form) || 0);
  element.dataset.spriteFamily = family;
  return applySafariSpeciesSprite(element, species, { size });
}

export function hasSafariSpeciesSpriteManifest() {
  return Boolean(manifest && index);
}
