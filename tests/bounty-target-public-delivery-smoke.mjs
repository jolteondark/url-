import assert from "node:assert/strict";
import fs from "node:fs";

const index = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const command = fs.readFileSync(new URL("../runtime/safari-pokemon-center-command.js", import.meta.url), "utf8");

const outerRevision = index.match(/\.\/runtime\/safari-pokemon-center-command\.js\?v=([0-9-]+)/)?.[1];
const nestedRevision = command.match(/\.\/mapless-bounty-target-board-placement-v108\.js\?v=([0-9-]+)/)?.[1];

assert.ok(outerRevision, "Safari pokemon-center command must have an explicit public revision");
assert.ok(nestedRevision, "bounty target placement nested import must have an explicit public revision");
assert.equal(outerRevision, nestedRevision, "outer and nested bounty continuation revisions must move together");
assert.notEqual(outerRevision, "20260901-2130", "pre-#1119 Safari command pin must not return");

console.log(`ok - bounty target public delivery ${outerRevision}`);
