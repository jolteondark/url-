import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../battle-turn-phase-presentation.js", import.meta.url), "utf8");

assert.match(source, /function ownerPhase\(/, "presentation must read orchestrator phase");
assert.match(source, /phase === "COMMAND"/, "COMMAND must be an explicit unlock boundary");
assert.match(source, /if \(phase\) return phase === "COMMAND" \|\| phase === "RESULT" \|\| phase === "REPLACEMENT";/, "owner phase must settle the legacy resolving latch");
assert.doesNotMatch(source, /if \(previewCommandBusy\(\)\) return false;\s*if \(battle\.completed/, "disabled-button feedback must not outrank owner phase");

console.log("safari second-turn command unlock smoke: PASS");