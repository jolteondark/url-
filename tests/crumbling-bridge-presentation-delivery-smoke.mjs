import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const presentation = await readFile(new URL("../crumbling-bridge-touch-presentation.js", import.meta.url), "utf8");
const manifest = JSON.parse(await readFile(new URL("../board-presentation-manifest.json", import.meta.url), "utf8"));

const revision = "20260902-0312";
assert.match(
  presentation,
  new RegExp(`safari-crumbling-bridge-interaction\\.js\\?v=${revision}`),
  "Crumbling Bridge presentation must pin the current Safari owner revision",
);
assert.match(
  presentation,
  new RegExp(`day-board-direct-persistence-handoff\\.js\\?v=${revision}`),
  "Crumbling Bridge presentation must pin the persistence handoff revision",
);
assert.ok(
  manifest.modules.includes(`./crumbling-bridge-touch-presentation.js?v=${revision}`),
  "board presentation manifest must deliver the refreshed Crumbling Bridge sidecar",
);
assert.doesNotMatch(presentation, /safari-crumbling-bridge-interaction\.js\?v=20260829-1658/);

console.log("crumbling bridge presentation delivery smoke: ok");
