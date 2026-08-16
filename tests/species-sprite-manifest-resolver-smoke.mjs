import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import {
  SAFARI_SPECIES_FORM_FRONT_ATLAS,
  SAFARI_SPECIES_FORM_FRONT_KEYS,
  resolveSafariSpeciesFormFrontSprite,
} from "../runtime/safari-species-form-front-atlas.js";

const resolver = fs.readFileSync(new URL("../runtime/safari-species-sprite-manifest-resolver.js", import.meta.url), "utf8");
const bridge = fs.readFileSync(new URL("../species-sprite-atlas-bridge.js", import.meta.url), "utf8");
if (!resolver.includes('mapless.browser-species-sprite-manifest.v1')) throw new Error("M0373 browser manifest schema missing");
if (!resolver.includes('`${species},${Number(form)}`')) throw new Error("form-specific sprite key missing");
if (!resolver.includes("applySafariSpeciesFormFrontSprite")) throw new Error("full Species/Form atlas fallback missing");
if (!resolver.includes("applySafariSpeciesSprite(element, species")) throw new Error("legacy base atlas fallback missing");
if (!bridge.includes("applySafariSpeciesSpriteWithManifest")) throw new Error("presentation bridge is not using manifest resolver");

assert.equal(SAFARI_SPECIES_FORM_FRONT_KEYS.length, 1669);
assert.equal(new Set(SAFARI_SPECIES_FORM_FRONT_KEYS).size, 1669);
assert.equal(SAFARI_SPECIES_FORM_FRONT_ATLAS.exactCount, 1654);
assert.equal(SAFARI_SPECIES_FORM_FRONT_ATLAS.fallbackCount, 15);
assert.equal(resolveSafariSpeciesFormFrontSprite("RATTATA", { form: 1 })?.key, "RATTATA,1");
assert.equal(resolveSafariSpeciesFormFrontSprite("DELTABULBASAUR")?.species, "DELTABULBASAUR");
assert.equal(resolveSafariSpeciesFormFrontSprite("NOT_A_CANONICAL_SPECIES"), null);
const bytes = fs.readFileSync(new URL("../assets/species-form/front.webp", import.meta.url));
assert.equal(bytes.length, SAFARI_SPECIES_FORM_FRONT_ATLAS.byteLength);
assert.equal(createHash("sha256").update(bytes).digest("hex"), SAFARI_SPECIES_FORM_FRONT_ATLAS.sha256);
assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF");
assert.equal(bytes.subarray(8, 12).toString("ascii"), "WEBP");
console.log(JSON.stringify({ ok: true, records: 1669, atlasBytes: bytes.length, sha256: SAFARI_SPECIES_FORM_FRONT_ATLAS.sha256 }));
