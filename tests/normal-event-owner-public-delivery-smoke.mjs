import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const indexSource = readFileSync(
  new URL("../index.html", import.meta.url),
  "utf8",
);

for (const owner of [
  "safari-traveling-cook-interaction.js",
  "safari-buried-item-interaction.js",
  "safari-egg-shop-interaction.js",
]) {
  const escaped = owner.replaceAll(".", "\\.");
  assert.match(
    indexSource,
    new RegExp(`\\./runtime/${escaped}\\": \\"\\./runtime/${escaped}\\?v=20260906-1730`),
    `${owner} must be published through the shared Safari/Web import map with a fresh generation`,
  );
}

console.log("normal-event owner public delivery smoke: ok");
