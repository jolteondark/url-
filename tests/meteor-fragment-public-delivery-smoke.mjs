import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const adapter = fs.readFileSync(path.join(root, "runtime", "safari-meteor-fragment-interaction.js"), "utf8");

assert.match(
  index,
  /"\.\/runtime\/safari-meteor-fragment-interaction\.js": "\.\/runtime\/safari-meteor-fragment-interaction\.js\?v=20260904-0200"/,
  "Safari must publish a fresh Meteor Fragment interaction generation after shared receipt convergence",
);
assert.match(
  adapter,
  /import \{ commitSafariBagEconomyReceipt \} from "\.\/safari-bag-economy-receipt\.js";/,
  "published Meteor Fragment adapter must use the shared Safari Bag/Economy receipt owner",
);
assert.doesNotMatch(
  adapter,
  /runtime\.bag\.slots\s*=/,
  "published Meteor Fragment adapter must not restore direct Safari-local Bag mutation",
);

console.log("Meteor Fragment public delivery smoke passed");
