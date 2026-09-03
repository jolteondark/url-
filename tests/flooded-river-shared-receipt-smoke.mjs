import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../runtime/safari-flooded-river-interaction.js", import.meta.url), "utf8");

assert.match(
  source,
  /import \{ commitSafariBagEconomyReceipt \} from "\.\/safari-bag-economy-receipt\.js";/,
  "Flooded River must use the shared Safari Bag receipt owner",
);
assert.match(
  source,
  /commitSafariBagEconomyReceipt\(runtime, \{ reward: specialReward \}\)/,
  "successful Water/Ice reward must commit through the shared receipt",
);
assert.doesNotMatch(
  source,
  /runtime\.bag\.slots\s*=\s*specialReward\.pockets\.general\.slots/,
  "Flooded River must not replace Bag slots locally after shared preflight",
);
assert.doesNotMatch(
  source,
  /specialReward\.granted\.map\(\(entry\) => \(\{ op: "runtime_grant_item"/,
  "Flooded River must not recreate shared receipt grant operations",
);
assert.match(
  source,
  /if \(!specialReward\.success\)[\s\S]*?completed: false,[\s\S]*?persistenceRequested: false/,
  "Bag-full preflight must remain non-terminal and mutation-free",
);

console.log("flooded-river-shared-receipt-smoke: ok");
