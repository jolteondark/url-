import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const adapter = fs.readFileSync(path.join(root, "runtime", "safari-meteor-fragment-interaction.js"), "utf8");

assert.match(
  adapter,
  /import \{ commitSafariBagEconomyReceipt \} from "\.\/safari-bag-economy-receipt\.js";/,
  "Meteor Fragment must settle Bag mutations through the shared Safari Bag/Economy receipt owner",
);
assert.doesNotMatch(
  adapter,
  /runtime\.bag\.slots\s*=/,
  "Meteor Fragment must not replace Safari Bag slots directly",
);
assert.doesNotMatch(
  adapter,
  /function applyReward\(/,
  "Meteor Fragment must not keep a Safari-local Bag settlement helper",
);
assert.match(
  adapter,
  /const receipt = reward\?\.success \? commitSafariBagEconomyReceipt\(runtime, \{ reward \}\) : null;/,
  "successful Meteor Fragment rewards must commit through the shared receipt owner",
);
assert.match(
  adapter,
  /if \(reward && !reward\.success\)[\s\S]*?persistenceRequested:false/,
  "Bag-full reward failure must remain non-terminal and non-persistent",
);

console.log("Meteor Fragment shared receipt smoke passed");
