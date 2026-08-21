import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  SAFARI_SPECIES_FORM_FRONT_ATLAS,
  SAFARI_SPECIES_FORM_FRONT_KEYS,
  resolveSafariSpeciesFormFrontSprite,
} from "../runtime/safari-species-form-front-atlas.js";
import { resolveSafariSpeciesSprite } from "../runtime/safari-species-sprite-atlas.js";
import { SAFARI_SPECIES_MASTERS } from "../runtime/safari-playable-data.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bytes = await readFile(path.join(root, "assets/species-form/front.webp"));
const deployedSha256 = createHash("sha256").update(bytes).digest("hex");

assert.equal(SAFARI_SPECIES_FORM_FRONT_ATLAS.recordCount, 1669);
assert.equal(SAFARI_SPECIES_FORM_FRONT_KEYS.length, 1669);
assert.equal(new Set(SAFARI_SPECIES_FORM_FRONT_KEYS).size, 1669);
assert.equal(bytes.length, SAFARI_SPECIES_FORM_FRONT_ATLAS.byteLength);
assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF");
assert.equal(bytes.subarray(8, 12).toString("ascii"), "WEBP");

// safari-playable-data intentionally bootstraps only three species. The full
// 875-species GENERAL master projection is installed lazily on combat entry;
// sprite coverage is owned by the independent 1669 species/form atlas keys.
const bootstrapSpecies = Object.keys(SAFARI_SPECIES_MASTERS);
assert.deepEqual(new Set(bootstrapSpecies), new Set(["EEVEE", "RATTATA", "PIKACHU"]));
for (const species of bootstrapSpecies) {
  assert.equal(resolveSafariSpeciesFormFrontSprite(species)?.species, species);
  assert.equal(resolveSafariSpeciesSprite(species)?.species, species);
}
for (const species of ["BULBASAUR", "ZWEILOUS", "GHOLDENGO"]) {
  assert.equal(resolveSafariSpeciesFormFrontSprite(species)?.species, species);
  assert.equal(resolveSafariSpeciesSprite(species)?.species, species);
}
assert.equal(resolveSafariSpeciesFormFrontSprite("NOT_A_CANONICAL_SPECIES"), null);
assert.equal(resolveSafariSpeciesSprite("NOT_A_CANONICAL_SPECIES"), null);

const formKey = SAFARI_SPECIES_FORM_FRONT_KEYS.find((key) => key.includes(","));
assert.ok(formKey, "species/form atlas must include alternate forms");
const splitAt = formKey.lastIndexOf(",");
const formSpecies = formKey.slice(0, splitAt);
const form = Number(formKey.slice(splitAt + 1));
const formSprite = resolveSafariSpeciesFormFrontSprite(formSpecies, { form });
assert.equal(formSprite?.key, formKey);
assert.equal(formSprite?.form, form);

console.log(JSON.stringify({
  ok: true,
  speciesForms: SAFARI_SPECIES_FORM_FRONT_ATLAS.recordCount,
  atlasBytes: bytes.length,
  deployedSha256,
  canonicalSourceGraphicsSha256: SAFARI_SPECIES_FORM_FRONT_ATLAS.sourceGraphicsSha256,
  bootstrapSpecies: bootstrapSpecies.length,
  alternateFormProbe: formKey,
}));
