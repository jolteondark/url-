import assert from "node:assert/strict";
import fs from "node:fs";

const boot = fs.readFileSync(new URL("../preview.js", import.meta.url), "utf8");
const combat = fs.readFileSync(new URL("../runtime/safari-web-combat-start.js", import.meta.url), "utf8");

assert.doesNotMatch(
  boot,
  /ensureSafariGeneralCombatData\s*\(/,
  "first-board boot must not preload combat GENERAL outside the Battle-start owner",
);
assert.match(
  boot,
  /await activateSafariDayBoardCell\(runtime, index\)/,
  "first-board boot must enter the existing public Day Board owner directly",
);
assert.match(
  boot,
  /normal_event[\s\S]*wounded_pokemon[\s\S]*ensureSafariGeneralData\(\)/,
  "non-combat wounded Pokemon may still demand canonical GENERAL masters before its own owner runs",
);
assert.match(
  combat,
  /await ensureSafariGeneralCombatData\(event\.kind\)/,
  "wild/trainer GENERAL demand must remain event-specific inside safari-web-combat-start",
);
assert.match(
  combat,
  /globalThis\.__maplessLastError = error/,
  "Battle-start owner must retain the exact rejected runtime exception",
);
assert.match(
  combat,
  /state\.board_events = dispatch\.state\.board_events/[\s\S]*state\.board_consumed = dispatch\.state\.board_consumed/,
  "Day Board mutation must remain committed only after combat materialization returns",
);

console.log("Safari first-board combat GENERAL demand stays inside the Battle-start owner: ok");
