import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../day-board-direct-persistence-handoff.js", import.meta.url), "utf8");

assert.match(source, /operation\?\.op === "request_save"/);
assert.match(source, /saveSafariPlayableRun\(globalThis\.localStorage, runtime\)/);
assert.doesNotMatch(source, /DIRECT_PERSISTENCE_KINDS/);
assert.doesNotMatch(source, /center|buried_item/);
assert.match(source, /state\?\.board_events\?\.\[index\]/);

console.log("day-board-direct-persistence-handoff-smoke: PASS");
