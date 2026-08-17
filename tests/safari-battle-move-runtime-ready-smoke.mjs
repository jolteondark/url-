import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../runtime/safari-web-playable-integration.js", import.meta.url), "utf8");

assert.match(
  source,
  /if \(event\?\.kind === "wild" \|\| event\?\.kind === "trainer"\)[\s\S]*?await full\(\);[\s\S]*?import\("\.\/safari-web-combat-start\.js"\)/,
  "combat activation must finish loading the full Battle round runtime before creating a visible Battle",
);
assert.match(
  source,
  /\.catch\(\(error\) => \{\s*fullModulePromise = null;/,
  "a failed full runtime import must be retryable instead of poisoning every later move tap",
);

console.log("Safari Battle visible commands require ready round runtime: PASS");
