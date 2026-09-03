import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const adapter = fs.readFileSync(path.join(root, "runtime", "safari-sleeping-giant-interaction.js"), "utf8");

assert.match(
  index,
  /"\.\/runtime\/safari-sleeping-giant-interaction\.js": "\.\/runtime\/safari-sleeping-giant-interaction\.js\?v=20260903-2310"/,
  "Safari import map must publish the post-#1173 Sleeping Giant interaction generation",
);
assert.match(
  adapter,
  /function alreadyConsumed\([\s\S]*?board_consumed[\s\S]*?normal_resolved/,
  "published Sleeping Giant adapter must include the already-consumed guard",
);
assert.match(
  adapter,
  /commitSafariBagEconomyReceipt\(runtime, \{ reward:rewardAttempt \}\)/,
  "published Sleeping Giant adapter must use the shared Bag/Economy receipt owner",
);
assert.doesNotMatch(
  adapter,
  /runtime\.bag\.slots\s*=/,
  "published Sleeping Giant adapter must not restore Safari-local Bag slot replacement",
);

console.log("Sleeping Giant public delivery smoke passed");
