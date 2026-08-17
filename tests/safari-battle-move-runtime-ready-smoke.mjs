import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../runtime/safari-web-playable-integration.js", import.meta.url), "utf8");

assert.match(
  source,
  /if \(event\?\.kind === "wild" \|\| event\?\.kind === "trainer"\)[\s\S]*?import\("\.\/safari-web-combat-start\.js"\)/,
  "combat board activation must use the lightweight combat-start path",
);
assert.doesNotMatch(
  source,
  /if \(event\?\.kind === "wild" \|\| event\?\.kind === "trainer"\)[\s\S]*?await full\(\);[\s\S]*?import\("\.\/safari-web-combat-start\.js"\)/,
  "combat board activation must not block on the full Battle runtime import",
);
assert.match(
  source,
  /\.catch\(\(error\) => \{\s*fullModulePromise = null;/,
  "a failed full runtime import must remain retryable",
);

console.log("Safari combat board activation stays lightweight: PASS");
