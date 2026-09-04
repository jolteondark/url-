import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const adapter = fs.readFileSync(path.join(root, "runtime", "safari-burning-wagon-interaction.js"), "utf8");

assert.match(
  index,
  /"\.\/runtime\/safari-burning-wagon-interaction\.js": "\.\/runtime\/safari-burning-wagon-interaction\.js\?v=20260904-0930"/,
  "Safari must publish a fresh Burning Wagon interaction generation after shared receipt convergence",
);
assert.match(
  adapter,
  /import \{ commitSafariBagEconomyReceipt \} from "\.\/safari-bag-economy-receipt\.js";/,
  "published Burning Wagon adapter must use the shared Safari Bag/Economy receipt owner",
);
assert.match(
  adapter,
  /commitSafariBagEconomyReceipt\(runtime, \{ reward \}\)/,
  "published Burning Wagon adapter must commit canonical reward output through the shared receipt",
);
assert.doesNotMatch(
  adapter,
  /runtime\.bag\.slots\s*=\s*reward\.pockets\.general\.slots/,
  "published Burning Wagon adapter must not restore direct Safari-local Bag mutation",
);

console.log("Burning Wagon public delivery smoke passed");
