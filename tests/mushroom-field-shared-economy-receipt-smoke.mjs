import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const interaction = await readFile(new URL("../runtime/safari-mushroom-field-interaction.js", import.meta.url), "utf8");

assert.match(interaction, /import \{ commitSafariBagEconomyReceipt \} from "\.\/safari-bag-economy-receipt\.js";/);
assert.match(interaction, /commitSafariBagEconomyReceipt\(runtime, \{ money: adjusted \}\)/);
assert.match(interaction, /receipt\.success/);
assert.doesNotMatch(interaction, /runtime\.bag\.money\s*=/);
assert.doesNotMatch(interaction, /setMoney\(/);

console.log("Mushroom Field sell reward uses the shared Safari Bag/Economy receipt without direct money mutation");
