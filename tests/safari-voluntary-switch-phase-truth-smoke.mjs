import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../battle-party-voluntary-switch-bridge.js", import.meta.url), "utf8");
const selectable = source.match(/function selectableBattle[\s\S]*?\n}\n/)?.[0] ?? "";

assert.match(selectable, /current\.phase === "COMMAND"/,
  "voluntary switch availability must be owned by the orchestrator COMMAND phase");
assert.doesNotMatch(selectable, /\.completed|player_replacement_required|previewCommandBusy/,
  "voluntary switch must not infer command availability from legacy Battle flags");
assert.match(selectable, /current\.origin !== "boundary_trial"/,
  "boundary trial remains outside the normal voluntary-switch owner");

console.log("Safari voluntary switch uses COMMAND as its sole normal-Battle phase truth: PASS");
