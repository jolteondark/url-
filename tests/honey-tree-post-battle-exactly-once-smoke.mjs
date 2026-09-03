import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const adapter = fs.readFileSync(path.join(root, "runtime", "safari-honey-tree-interaction.js"), "utf8");

assert.match(
  adapter,
  /function alreadyConsumed\(state, index, event\)[\s\S]*state\.board_consumed\?\.\[index\][\s\S]*event\?\.normal_resolved/,
  "Honey Tree must recognize either consumed Board state or canonical normal_resolved state",
);
assert.match(
  adapter,
  /registerSafariNormalEventBattleContinuation\("honey_tree",[\s\S]*if \(alreadyConsumed\(state, index, event\)\)[\s\S]*result:"already_consumed"[\s\S]*operations:\[\][\s\S]*persistenceRequested:false/,
  "duplicate Honey Tree Battle RETURN must terminate without reward or persistence mutation",
);
assert.match(
  adapter,
  /import \{ commitSafariBagEconomyReceipt \} from "\.\/safari-bag-economy-receipt\.js";/,
  "Honey Tree rewards must use the shared Safari Bag/Economy receipt owner",
);
assert.doesNotMatch(
  adapter,
  /runtime\.bag\.slots\s*=/,
  "Honey Tree must not restore Safari-local Bag slot mutation",
);
assert.match(
  adapter,
  /filter\(\(operation\) => operation\?\.op !== "start_wild_battle" && operation\?\.op !== "grant_items"\)/,
  "post-Battle owner projection must not duplicate the shared receipt item grant",
);

console.log("Honey Tree post-Battle exactly-once smoke passed");
