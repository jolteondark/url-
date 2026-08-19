import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../battle-turn-phase-presentation.js", import.meta.url), "utf8");

assert.match(source, /function ownerPhase\(/, "presentation must read orchestrator phase");
assert.match(source, /phase === "COMMAND"/, "COMMAND must be an explicit unlock boundary");
assert.doesNotMatch(source, /if \(previewCommandBusy\(\)\) return false;/, "legacy disabled-button feedback must not block settling");
assert.match(source, /if \(phase\) return phase !== "COMMAND" && phase !== "RESULT";/, "owner phase must decide whether resolution remains locked");

console.log("safari second-turn command unlock smoke: PASS");
