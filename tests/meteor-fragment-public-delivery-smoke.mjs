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
  /"\.\/runtime\/safari-meteor-fragment-interaction\.js": "\.\/runtime\/safari-meteor-fragment-interaction\.js\?v=20260909-2000"/,
  "Safari must publish the owner-persistence Meteor Fragment interaction generation",
);
assert.doesNotMatch(
  index,
  /safari-meteor-fragment-interaction\.js\?v=20260904-0200/,
  "Safari must not keep the pre-owner-persistence Meteor Fragment generation pinned",
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
assert.match(
  adapter,
  /request_save[^\n]*meteor_fragment_resolved/,
  "resolved Meteor Fragment mutations must publish owner save intent",
);
assert.match(
  adapter,
  /persistenceRequested:state\.last_operations\.some\(\(operation\) => operation\?\.op === "request_save"\)/,
  "Safari persistence projection must derive from owner operations",
);

console.log("Meteor Fragment public delivery smoke passed");
