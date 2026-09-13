import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "canonical-battle-sprite-bridge.js"), "utf8");

assert.match(source, /const directProbeFailures = new Map\(\);/);
assert.match(source, /const directProbeRetryTimers = new Map\(\);/);
assert.match(source, /DIRECT_PROBE_RETRY_DELAYS_MS = Object\.freeze\(\[5000, 30000, 300000\]\)/);
assert.doesNotMatch(source, /failedDirectProbes = new Set/);
assert.doesNotMatch(source, /failure\.attempts > DIRECT_PROBE_RETRY_DELAYS_MS\.length/);
assert.match(source, /Math\.min\(attempts - 1, DIRECT_PROBE_RETRY_DELAYS_MS\.length - 1\)/);
assert.match(source, /\?retry=\$\{failure\.token\}-\$\{failure\.attempts\}/);
assert.match(source, /noteDirectProbeFailure\(asset\.probeKey\)/);
assert.match(source, /clearDirectProbeFailure\(asset\.probeKey\)/);
assert.match(source, /setTimeout\(\(\) => \{/);

console.log("canonical battle direct probe retry smoke: ok");
