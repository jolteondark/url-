import fs from "node:fs";

const party = fs.readFileSync(new URL("../party-panel-bridge.js", import.meta.url), "utf8");
const storage = fs.readFileSync(new URL("../storage-panel-bridge.js", import.meta.url), "utf8");
const bridge = fs.readFileSync(new URL("../species-sprite-atlas-bridge.js", import.meta.url), "utf8");

for (const [name, source] of [["party", party], ["storage", storage]]) {
  if (!source.includes("dataset.species")) throw new Error(`${name} panel must expose species metadata`);
  if (!source.includes("dataset.form")) throw new Error(`${name} panel must expose form metadata`);
}
if (!bridge.includes("root.dataset.species")) throw new Error("sprite bridge must prefer structured species metadata");
if (!bridge.includes("root.dataset.form")) throw new Error("sprite bridge must preserve structured form metadata");
console.log("species sprite form bridge smoke PASS");
