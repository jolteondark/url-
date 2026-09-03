import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const adapter = fs.readFileSync(path.join(root, "runtime", "safari-flooded-river-interaction.js"), "utf8");

assert.match(
  index,
  /"\.\/runtime\/safari-flooded-river-interaction\.js": "\.\/runtime\/safari-flooded-river-interaction\.js\?v=20260904-0830"/,
  "Safari must publish a fresh Flooded River interaction generation after shared receipt convergence",
);
assert.match(
  adapter,
  /import \{ commitSafariBagEconomyReceipt \} from "\.\/safari-bag-economy-receipt\.js";/,
  "published Flooded River adapter must use the shared Safari Bag/Economy receipt owner",
);
assert.match(
  adapter,
  /commitSafariBagEconomyReceipt\(runtime, \{ reward: specialReward \}\)/,
  "published Flooded River adapter must commit canonical reward output through the shared receipt",
);
assert.doesNotMatch(
  adapter,
  /runtime\.bag\.slots\s*=\s*specialReward\.pockets\.general\.slots/,
  "published Flooded River adapter must not restore direct Safari-local Bag mutation",
);

console.log("Flooded River public delivery smoke passed");
