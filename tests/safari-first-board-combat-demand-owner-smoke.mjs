import assert from "node:assert/strict";
import fs from "node:fs";

const boot = fs.readFileSync(new URL("../preview.js", import.meta.url), "utf8");
const app = fs.readFileSync(new URL("../preview-app.js", import.meta.url), "utf8");
const demand = fs.readFileSync(new URL("../runtime/safari-general-data-demand.js", import.meta.url), "utf8");
const publicEntry = fs.readFileSync(new URL("../runtime/safari-web-playable-integration.js", import.meta.url), "utf8");
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

const implicitGuard = demand.indexOf("if (implicitKind) {");
const masterDemand = demand.indexOf("await ensureSafariGeneralData();", implicitGuard);
assert.ok(implicitGuard >= 0 && masterDemand > implicitGuard,
  "kind-less post-boot combat preflight must return before any async GENERAL master demand");
assert.match(
  app,
  /await ensureBoardActionData\(index\);[\s\S]*await activateSafariDayBoardCell\(runtime, index\)/,
  "post-boot Day Board clicks must continue into the same public combat owner",
);
assert.match(
  publicEntry,
  /try\s*\{[\s\S]*import\("\.\/safari-web-combat-start\.js"\)[\s\S]*await activateSafariWebCombatCell\(runtime, index\)[\s\S]*globalThis\.__maplessLastError = error[\s\S]*throw error/,
  "public wild/trainer entry must preserve the exact error even if the combat-owner module itself fails to import",
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

// #216/#218 are part of the actual first-board Battle entry contract, not just
// optional diagnostics. Keep them inside the default test:battle-entry gate.
assert.match(
  app,
  /window\.addEventListener\("safari-runtime-changed", render\)/,
  "Battle state publication must have a loaded render consumer",
);
for (const stage of [
  "board_click",
  "preview_app_import_start",
  "preview_app_import_ready",
  "preview_start_dispatched",
  "combat_entry_import_start",
  "combat_entry_import_ready",
  "board_owner_start",
  "board_owner_ready",
  "scene_handoff_dispatch",
  "scene_handoff_frame",
  "scene_handoff_ready",
]) {
  assert.match(
    boot,
    new RegExp(`traceBattleStart\\(\\"${stage}\\"`),
    `first-board entry gate must retain lifecycle stage: ${stage}`,
  );
}
assert.match(
  boot,
  /if \(!trace\.sceneVisible\)[\s\S]*throw new Error\("Battle state created but Battle scene did not become visible"\)/,
  "first-board entry must fail explicitly when Battle state exists but the scene is not visible",
);
assert.match(
  boot,
  /if \(trace\.moveButtonCount === 0\)[\s\S]*throw new Error\("Battle state created but no move buttons were rendered"\)/,
  "first-board entry must fail explicitly when Battle state exists but owner-backed moves are absent",
);

console.log("Safari boot/post-boot Battle entry retains one owner, render handoff, lifecycle trace, and exact failures: ok");
