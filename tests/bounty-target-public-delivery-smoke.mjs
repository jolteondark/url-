import assert from "node:assert/strict";
import fs from "node:fs";

const index = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const command = fs.readFileSync(new URL("../runtime/safari-pokemon-center-command.js", import.meta.url), "utf8");

const outerRevision = index.match(/\.\/runtime\/safari-pokemon-center-command\.js\?v=([0-9-]+)/)?.[1];
const nestedRevision = command.match(/\.\/mapless-bounty-target-board-placement-v108\.js\?v=([0-9-]+)/)?.[1];
const interactionRevision = index.match(/\.\/runtime\/safari-bounty-target-interaction\.js\?v=([0-9-]+)/)?.[1];

assert.ok(outerRevision, "Safari pokemon-center command must have an explicit public revision");
assert.ok(nestedRevision, "bounty target placement nested import must have an explicit public revision");
assert.ok(interactionRevision, "bounty target interaction must have an explicit public revision");
assert.notEqual(outerRevision, "20260902-1028", "pre-#1141 Safari command pin must not return");
assert.notEqual(interactionRevision, "20260903-0132", "pre-#1143 bounty interaction pin must not return");
assert.match(
  command,
  /event\.normal_event_id === "bounty_target"\) return startSafariBountyTargetBattle\(runtime, index\)/,
  "the delivered Day Board dispatcher must route bounty_target touch to its Battle continuation adapter",
);

console.log(`ok - bounty target public delivery command=${outerRevision} interaction=${interactionRevision}`);
