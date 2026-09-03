import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const preview = fs.readFileSync(path.join(root, "preview.js"), "utf8");

assert.match(
  index,
  /<script type="module" src="\.\/preview\.js\?v=20260904-0100"><\/script>/,
  "public preview entry must use the canonical Battle UI delivery generation",
);
assert.match(
  preview,
  /import \{ installCanonicalBattleUiAssets \} from "\.\/runtime\/canonical-battle-ui-assets\.js";/,
  "published preview must import the shared canonical Battle UI adapter",
);
assert.match(
  preview,
  /installCanonicalBattleUiAssets\(\)/,
  "published preview boot must install canonical Battle UI assets",
);

console.log("Canonical Battle UI public-delivery smoke passed");
