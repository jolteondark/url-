import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../carryover-next-run-presentation.js", import.meta.url), "utf8");

assert.match(source, /function exactStateSnapshot\(state\)/);
assert.match(source, /function rememberExactError\(error, state\)/);
assert.match(source, /exact\.state = exactStateSnapshot\(state\)/,
  "carryover presentation failures must retain the exact pending-home state");
assert.match(source, /globalThis\.__maplessLastError = exact/,
  "carryover presentation failures must retain the same diagnosed Error globally");
assert.match(source, /catch \(error\) \{\s*rememberExactError\(error, state\);/s,
  "candidate-list failures must retain the pending-home state");
assert.match(source, /catch \(error\) \{\s*rememberExactError\(error, stateOfRuntime\(\)\);/s,
  "selection\/Storage-overflow failures must retain the current pending-home state");
assert.match(source, /carryover presentation board-card is unavailable/,
  "missing board-card diagnostics must remain exact");
assert.match(source, /通常スターターで始める/,
  "zero-candidate\/candidate-load fallback must remain explicit");

console.log("Safari carryover exact Error + exact pending-home state diagnostics: ok");
