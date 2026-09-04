import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../runtime/safari-berry-contest-interaction.js", import.meta.url), "utf8");

assert.match(source, /import \{ commitSafariBagEconomyReceipt \} from "\.\/safari-bag-economy-receipt\.js";/);
assert.doesNotMatch(source, /runtime\.bag\.slots\s*=/);
assert.doesNotMatch(source, /runtime\.bag\.money\s*=/);
assert.match(source, /commitSafariBagEconomyReceipt\(runtime, \{ reward:resolved \}\)/);
assert.match(source, /receipt\.operations\.map/);
assert.match(source, /resolveBerryContest\(/);
assert.match(source, /request_save", reason:"berry_contest_resolved"/);
assert.match(source, /persistenceRequested:true/);

console.log("Berry Contest rewards and entry costs use the shared Safari Bag/Economy receipt");
