import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const adapter = fs.readFileSync(path.join(root, "runtime", "safari-honey-tree-interaction.js"), "utf8");

assert.match(
  index,
  /"\.\/runtime\/safari-honey-tree-interaction\.js": "\.\/runtime\/safari-honey-tree-interaction\.js\?v=20260904-0230"/,
  "Safari must publish a fresh Honey Tree interaction generation after exactly-once convergence",
);
assert.match(
  adapter,
  /import \{ commitSafariBagEconomyReceipt \} from "\.\/safari-bag-economy-receipt\.js";/,
  "published Honey Tree adapter must use the shared Safari Bag/Economy receipt owner",
);
assert.match(
  adapter,
  /result:\"already_consumed\"/,
  "published Honey Tree adapter must preserve the terminal replay guard",
);
assert.doesNotMatch(
  adapter,
  /runtime\.bag\.slots\s*=/,
  "published Honey Tree adapter must not restore direct Safari-local Bag mutation",
);

console.log("Honey Tree public delivery smoke passed");
