import fs from "node:fs";
import assert from "node:assert/strict";

const bridge = fs.readFileSync(new URL("../canonical-battleback-presentation-bridge.js", import.meta.url), "utf8");
const match = bridge.match(/canonical-battleback-sources\.js\?v=(\d{8}-\d{4})/);
assert.ok(match, "battleback presentation must pin the nested canonical battleback resolver");
assert.equal(match[1], "20260901-2300", "battleback nested resolver delivery pin must match the current presentation generation");
assert.ok(!bridge.includes('from "./runtime/canonical-battleback-sources.js";'), "unversioned nested battleback resolver import must not return");

console.log("battleback nested resolver delivery smoke: ok");
