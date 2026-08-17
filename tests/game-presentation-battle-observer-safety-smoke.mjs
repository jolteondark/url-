import assert from "node:assert/strict";
import fs from "node:fs";

const presentation = fs.readFileSync(new URL("../game-presentation.js", import.meta.url), "utf8");
const statusBridge = fs.readFileSync(new URL("../canonical-battle-status-bridge.js", import.meta.url), "utf8");

assert.doesNotMatch(
  presentation,
  /new MutationObserver\(schedulePresentation\)\.observe\(battle/,
  "generic game presentation must not observe the Battle subtree",
);
assert.doesNotMatch(
  presentation,
  /function decorateBattle|function hpTone|function decorateMoves/,
  "legacy Battle decoration must stay out of the generic presentation layer",
);
assert.match(
  statusBridge,
  /resolveSafariCanonicalHpZone/,
  "canonical Battle status bridge must remain the HP-zone owner",
);
assert.match(
  statusBridge,
  /window\.addEventListener\("safari-runtime-changed", scheduleSync/,
  "canonical Battle status must stay runtime-event driven",
);
assert.doesNotMatch(
  statusBridge,
  /new MutationObserver/,
  "canonical Battle status bridge must remain observer-free",
);

console.log("game presentation Battle ownership smoke: ok");
