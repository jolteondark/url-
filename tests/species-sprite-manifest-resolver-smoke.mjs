import fs from "node:fs";

const resolver = fs.readFileSync(new URL("../runtime/safari-species-sprite-manifest-resolver.js", import.meta.url), "utf8");
const bridge = fs.readFileSync(new URL("../species-sprite-atlas-bridge.js", import.meta.url), "utf8");
if (!resolver.includes('mapless.browser-species-sprite-manifest.v1')) throw new Error("M0373 browser manifest schema missing");
if (!resolver.includes('`${species},${Number(form)}`')) throw new Error("form-specific sprite key missing");
if (!resolver.includes("applySafariSpeciesSprite(element, species")) throw new Error("base atlas fallback missing");
if (!bridge.includes("applySafariSpeciesSpriteWithManifest")) throw new Error("presentation bridge is not using manifest resolver");
console.log("species sprite manifest resolver smoke PASS");
