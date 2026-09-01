import fs from "node:fs";
import assert from "node:assert/strict";

const loader = fs.readFileSync(new URL("../deferred-ui-loader.js", import.meta.url), "utf8");
const manifest = JSON.parse(fs.readFileSync(new URL("../board-presentation-manifest.json", import.meta.url), "utf8"));

const fallbackBlock = loader.match(/const boardPresentationFallbackModules = \[(.*?)\];/s);
assert.ok(fallbackBlock, "deferred loader must define board presentation fallback modules");

const fallbackModules = [...fallbackBlock[1].matchAll(/"([^\"]+\.js\?v=[^\"]+)"/g)].map((match) => match[1]);
assert.deepEqual(
  fallbackModules,
  manifest.modules,
  "manifest failure fallback must deliver the same board presentation generation as the no-store manifest",
);

console.log(`board presentation fallback revision smoke: ok (${fallbackModules.length} modules)`);
