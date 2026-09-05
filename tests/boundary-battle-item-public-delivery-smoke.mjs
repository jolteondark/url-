import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const generation = "20260906-0330";
for (const modulePath of [
  "safari-web-playable-integration.js",
  "safari-playable-integration.js",
  "safari-playable-integration-boundary.js",
  "safari-normal-battle-lifecycle.js",
  "safari-battle-item-mutation-owner.js",
]) {
  const escaped = modulePath.replaceAll(".", "\\.");
  assert.match(
    index,
    new RegExp(`"\\./runtime/${escaped}": "\\./runtime/${escaped}\\?v=${generation}"`),
    `public import map must refresh ${modulePath}`,
  );
}

console.log("boundary Battle ITEM public delivery smoke: ok");
