import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../runtime/safari-old-statue-interaction.js", import.meta.url), "utf8");

assert.match(
  source,
  /request_save[\s\S]*old_statue_resolved/,
  "resolved Old Statue mutations must emit save intent into operations",
);
assert.match(
  source,
  /function operationsRequestSave\([\s\S]*operation\?\.op === "request_save"/,
  "Safari persistence projection must be derived from operation save intent",
);
assert.doesNotMatch(
  source,
  /persistenceRequested:\s*true/,
  "fixed persistence booleans must not remain a second save authority",
);
assert.match(
  source,
  /persistenceRequested:operationsRequestSave\(state\.last_operations\)/,
  "completed Old Statue routes must project owner-driven request_save",
);
assert.match(
  source,
  /action === "break"[\s\S]*break_roll[\s\S]*roll < 95[\s\S]*resolveOldStatue\(\{ event, choice:"break" \}\)[\s\S]*applyPartyDamage\(runtime, 15\)/,
  "canonical collapse break outcome must apply its 15 percent party damage",
);
assert.match(
  source,
  /function finishPartyWipe[\s\S]*maplessPartyAllFainted[\s\S]*finishMaplessRun[\s\S]*normal_event:old_statue/,
  "Old Statue collapse must hand a party wipe to the shared run-end lifecycle",
);
assert.match(
  source,
  /old_statue_break_reward_owner_pending[\s\S]*イベントは消費していません/,
  "unconnected guardian/reward break outcomes must remain non-destructive",
);

console.log("old statue owner persistence smoke: ok");
