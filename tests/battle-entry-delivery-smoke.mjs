import assert from "node:assert/strict";
import fs from "node:fs";

const index = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

const parent = index.match(/"\.\/runtime\/safari-web-playable-integration\.js":\s*"\.\/runtime\/safari-web-playable-integration\.js\?v=([^"]+)"/);
const combat = index.match(/"\.\/runtime\/safari-web-combat-start\.js":\s*"\.\/runtime\/safari-web-combat-start\.js\?v=([^"]+)"/);

assert.ok(parent, "served shared Battle entry must be versioned in the import map");
assert.ok(combat, "nested combat-start owner must be explicitly versioned in the import map");
assert.equal(
  combat[1],
  parent[1],
  "shared Battle entry and nested combat-start owner must ship in one delivery generation",
);
assert.notEqual(parent[1], "20260901-2130", "Battle entry must not regress to the pre-#1129 Safari cache generation");
assert.notEqual(parent[1], "20260902-1707", "Battle entry must not regress to the pre-#1133 Safari cache generation");

console.log("battle entry delivery smoke: ok");
