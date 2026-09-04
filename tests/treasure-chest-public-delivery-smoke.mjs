import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [index, interaction] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../runtime/safari-treasure-chest-interaction.js", import.meta.url), "utf8"),
]);

assert.match(
  index,
  /"\.\/runtime\/safari-treasure-chest-interaction\.js": "\.\/runtime\/safari-treasure-chest-interaction\.js\?v=20260904-1200"/,
);
assert.match(interaction, /commitSafariBagEconomyReceipt/);
assert.doesNotMatch(interaction, /runtime\.bag\.slots\s*=/);
assert.doesNotMatch(interaction, /runtime\.bag\.money\s*=/);

console.log("Treasure Chest public delivery points at the shared Bag/Economy receipt generation");
