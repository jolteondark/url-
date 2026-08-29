import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../runtime/safari-flee-command.js", import.meta.url), "utf8");

assert.match(source, /certainEscapeByItem = false/);
assert.match(source, /commandKind = "flee"/);
assert.match(source, /certainEscapeByItem: Boolean\(certainEscapeByItem\)/);
assert.match(source, /beginSafariBattleCommand\(runtime, commandKind\)/);
assert.match(source, /commitSafariBattleResolution\(runtime, result, commandKind/);
assert.match(source, /commandKind !== "flee" && commandKind !== "item"/);

console.log("safari flee certain-escape owner smoke: ok");
