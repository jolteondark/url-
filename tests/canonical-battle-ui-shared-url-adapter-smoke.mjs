import fs from "node:fs";
import assert from "node:assert/strict";

const source = fs.readFileSync(new URL("../canonical-battle-ui-bridge.js", import.meta.url), "utf8");

assert.match(
  source,
  /import\s*\{\s*canonicalBattleUiAssetUrl\s*\}\s*from\s*["']\.\/runtime\/canonical-battle-ui-sources\.js["'];/,
  "battle UI bridge must use the shared canonical URL adapter",
);
assert.ok(
  !source.includes("canonicalBattleUiCandidates"),
  "battle UI bridge must not bypass the shared URL adapter with candidate-path handling",
);
assert.match(
  source,
  /const assetUrl = canonicalBattleUiAssetUrl\(assetName\);/,
  "each CSS asset must resolve through canonicalBattleUiAssetUrl",
);
assert.ok(
  !/new URL\(candidate, import\.meta\.url\)/.test(source),
  "consumer must not reconstruct canonical asset URLs locally",
);
assert.match(
  source,
  /if \(!assetUrl\) \{\s*card\.style\.removeProperty\(property\);/s,
  "unresolved canonical assets must fail closed",
);

console.log("canonical battle UI shared URL adapter smoke: ok");
