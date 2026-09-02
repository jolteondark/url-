import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../canonical-battle-status-bridge.js", import.meta.url), "utf8");

const match = source.match(/from\s+["']\.\/runtime\/safari-canonical-hp-zone\.js\?v=([0-9-]+)["']/);
assert.ok(match, "battle status bridge must version its nested canonical HP-zone import for Safari delivery");
assert.notEqual(match[1], "", "nested canonical HP-zone revision must not be empty");
assert.ok(!source.includes('from "./runtime/safari-canonical-hp-zone.js";'), "unversioned nested HP-zone import must not return");

console.log(`canonical battle status nested delivery smoke: ok (${match[1]})`);
