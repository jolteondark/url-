import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../item-collector-touch-presentation.js", import.meta.url), "utf8");

assert.match(source, /persistSafariOwnerResult/);
assert.doesNotMatch(source, /saveSafariPlayableRun/);
assert.match(source, /resolveSafariItemCollectorInteraction/);

console.log("item collector shared persistence smoke: ok");
