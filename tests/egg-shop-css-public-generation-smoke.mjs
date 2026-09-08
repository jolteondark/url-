import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const indexHtml = await readFile(new URL("../index.html", import.meta.url), "utf8");

assert.match(
  indexHtml,
  /egg-shop-touch-presentation\.css\?v=20260909-0500/,
  "Egg Shop public CSS generation must publish the current touch presentation stylesheet",
);
assert.doesNotMatch(
  indexHtml,
  /egg-shop-touch-presentation\.css\?v=20260820-2145/,
  "Egg Shop public CSS generation must not reuse the stale pre-final-style cache key",
);

console.log("egg shop CSS public generation smoke: ok");
