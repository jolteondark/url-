import assert from "node:assert/strict";
import fs from "node:fs";

const manifest = JSON.parse(fs.readFileSync(new URL("../board-presentation-manifest.json", import.meta.url), "utf8"));
const loader = fs.readFileSync(new URL("../deferred-ui-loader.js", import.meta.url), "utf8");

const modulePath = "./crumbling-bridge-touch-presentation.js";
const manifestEntry = manifest.modules.find((entry) => entry.startsWith(modulePath));
assert.ok(manifestEntry, "Crumbling Bridge must be delivered by the Board presentation manifest");
assert.ok(
  loader.includes(JSON.stringify(manifestEntry)),
  `Board presentation fallback must match manifest delivery entry: ${manifestEntry}`,
);

console.log("board presentation fallback delivery smoke: ok");
