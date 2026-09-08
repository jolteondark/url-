import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const command = await readFile(new URL("../runtime/safari-pokemon-center-command.js", import.meta.url), "utf8");
const shared = await readFile(new URL("../normal-event-touch-presentation.js", import.meta.url), "utf8");
const legacy = await readFile(new URL("../item-collector-touch-presentation.js", import.meta.url), "utf8");

assert.match(command, /openSafariItemCollectorTouch/);
assert.match(command, /normal_event_id === "item_collector"/);
assert.match(shared, /item_collector:"\.\/runtime\/safari-item-collector-interaction\.js"/);
assert.match(shared, /resolveSafariItemCollectorInteraction/);
assert.match(shared, /category:ball/);
assert.match(shared, /category:medicine/);
assert.match(shared, /active\.category = null/);
assert.doesNotMatch(legacy, /addEventListener\("click"/);
assert.doesNotMatch(legacy, /stopImmediatePropagation/);
assert.doesNotMatch(legacy, /persistSafariOwnerResult|saveSafariPlayableRun/);
assert.match(legacy, /openSafariItemCollectorTouch/);

console.log("item collector shared dispatch smoke: ok");
