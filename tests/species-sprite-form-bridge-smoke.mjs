import fs from "node:fs";

const metadata = fs.readFileSync(new URL("../species-form-metadata-bridge.js", import.meta.url), "utf8");
const bridge = fs.readFileSync(new URL("../species-sprite-atlas-bridge.js", import.meta.url), "utf8");

if (!metadata.includes("root.dataset.species")) throw new Error("metadata bridge must expose species identity");
if (!metadata.includes("root.dataset.form")) throw new Error("metadata bridge must expose form identity");
if (!bridge.includes("stampSafariSpeciesFormMetadata")) throw new Error("sprite bridge must stamp runtime metadata before rendering");
if (!bridge.includes("root?.dataset?.species")) throw new Error("sprite bridge must prefer structured species metadata");
if (!bridge.includes("sprite.dataset.spriteForm")) throw new Error("sprite bridge must preserve form on the rendered sprite");
console.log("species sprite form bridge smoke PASS");
