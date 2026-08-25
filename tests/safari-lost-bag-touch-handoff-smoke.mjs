import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const generic = await readFile(new URL("../normal-event-touch-presentation.js", import.meta.url), "utf8");
const sidecar = await readFile(new URL("../lost-bag-touch-presentation.js", import.meta.url), "utf8");
const owner = await readFile(new URL("../runtime/safari-lost-bag-interaction.js", import.meta.url), "utf8");

const sidecarPos = index.indexOf("lost-bag-touch-presentation.js");
const genericPos = index.indexOf("normal-event-touch-presentation.js?v=");
assert.ok(sidecarPos >= 0, "Safari page must load Lost Bag touch sidecar");
assert.ok(genericPos > sidecarPos, "Lost Bag sidecar must register before generic normal-event presentation");
assert.match(sidecar, /normal_event_id === "lost_bag"/);
assert.match(sidecar, /data-board-index/);
assert.match(sidecar, /id:"open"/);
assert.match(sidecar, /id:"wait"/);
assert.match(sidecar, /id:"leave"/);
assert.match(generic, /lost_bag:"\.\/runtime\/safari-lost-bag-interaction\.js"/);
assert.match(generic, /active\.eventId === "lost_bag"/);
assert.match(owner, /blockedBy:"#846"/);
assert.match(owner, /new RubyMT19937Random\(Number\(event\.normal_seed/);
assert.match(owner, /borrowSafariSharedRunRandomInt/);

console.log("Safari Lost Bag touch handoff smoke passed");
