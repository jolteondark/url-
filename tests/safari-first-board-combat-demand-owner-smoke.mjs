import assert from "node:assert/strict";
import fs from "node:fs";

const boot = fs.readFileSync(new URL("../preview.js", import.meta.url), "utf8");
const app = fs.readFileSync(new URL("../preview-app.js", import.meta.url), "utf8");
const demand = fs.readFileSync(new URL("../runtime/safari-general-data-demand.js", import.meta.url), "utf8");
const publicEntry = fs.readFileSync(new URL("../runtime/safari-web-playable-integration.js", import.meta.url), "utf8");
const combat = fs.readFileSync(new URL("../runtime/safari-web-combat-start.js", import.meta.url), "utf8");

assert.doesNotMatch(
  boot,
  /activateSafariDayBoardCell|data-boot-board-index|onBootBoardChoice|activateInitialBoardChoice/,
  "boot must not own a shadow first-board activation path",
);
assert.match(
  boot,
  /await appPromise;[\s\S]*safari-preview-start[\s\S]*preview_ready_for_board_click/,
  "New/Continue must load the real preview app before the player can choose a Board cell",
);
assert.match(
  app,
  /byId\("board"\)\.addEventListener\("click"[\s\S]*await ensureBoardActionData\(index\);[\s\S]*await activateSafariDayBoardCell\(runtime, index\)/,
  "the first and later Board clicks must share the same real Day Board owner path",
);
assert.match(
  app,
  /const combatSnapshot = snapshotBoardCombatState\(index\)[\s\S]*finally\s*\{[\s\S]*try\s*\{\s*render\(\);\s*\}\s*catch \(error\)[\s\S]*restoreBoardCombatState\(combatSnapshot\)[\s\S]*throw error/,
  "a Battle-scene render failure after successful materialization must restore the pre-click Board state and keep the exact rejection",
);
assert.match(
  app,
  /state\.board_events = snapshot\.board_events[\s\S]*state\.board_revealed = snapshot\.board_revealed[\s\S]*state\.board_consumed = snapshot\.board_consumed[\s\S]*state\.battle = snapshot\.battle/,
  "presentation rollback must uncommit both the Board cell and newly-created Battle state",
);
assert.match(
  app,
  /hadEncounterSeed[\s\S]*preview_encounter_seed[\s\S]*hadEncounterCounter[\s\S]*preview_encounter_counter/,
  "presentation rollback must preserve deterministic encounter retry state",
);

const implicitGuard = demand.indexOf("if (implicitKind) {");
const masterDemand = demand.indexOf("await ensureSafariGeneralData();", implicitGuard);
assert.ok(implicitGuard >= 0 && masterDemand > implicitGuard,
  "kind-less presentation preflight must return before any async GENERAL master demand");
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
  /state\.notice = "戦闘データを読み込んでいます…";[\s\S]*notifySafariRuntimeChanged\(\);[\s\S]*await ensureSafariGeneralCombatData\(event\.kind\)/,
  "GENERAL loading state must publish through the same runtime handoff before the selected async demand begins",
);
assert.match(
  combat,
  /if \(state\.battle\) globalThis\.__maplessLastError = null;[\s\S]*if \(state\.battle\) notifySafariRuntimeChanged\(\);/,
  "materialized Battle state must publish a second runtime handoff after loading completes",
);
assert.match(
  combat,
  /state\.notice = previousNotice;[\s\S]*notifySafariRuntimeChanged\(\);[\s\S]*throw error;/,
  "failed GENERAL demand must repaint the restored Board state before preserving the exact rejection",
);
assert.match(
  combat,
  /state\.board_events = dispatch\.state\.board_events[\s\S]*state\.board_consumed = dispatch\.state\.board_consumed/,
  "Day Board mutation must remain committed only after combat materialization returns",
);

assert.match(
  app,
  /window\.addEventListener\("safari-runtime-changed", render\)/,
  "Battle state publication must have a loaded render consumer before Board input",
);
for (const stage of [
  "preview_start_request",
  "preview_app_import_start",
  "preview_app_import_ready",
  "preview_start_dispatched",
  "preview_ready_for_board_click",
  "scene_handoff_frame",
  "scene_handoff_ready",
]) {
  assert.match(
    boot,
    new RegExp(`traceBattleStart\\(\\"${stage}\\"`),
    `Battle entry gate must retain lifecycle stage: ${stage}`,
  );
}
assert.match(
  boot,
  /window\.addEventListener\("error", captureBattleRenderError\)/,
  "boot must preserve an exact Battle render exception",
);
assert.match(
  boot,
  /state\?\.battle[\s\S]*event\?\.error instanceof Error[\s\S]*__maplessLastError = event\.error[\s\S]*scene_render_error/,
  "only a real Battle-scene window error should replace the exact Battle-start error surface",
);
assert.match(
  boot,
  /window\.addEventListener\("safari-runtime-changed", traceSceneAfterRuntimeChange\)/,
  "runtime publication must leave a post-render scene/move trace without owning the transition",
);
assert.match(
  boot,
  /sceneVisible:[\s\S]*moveButtonCount:[\s\S]*__maplessBattleStartTrace = trace/,
  "post-render trace must distinguish Battle state, visible scene, and move controls",
);

console.log("Safari Board combat owner keeps materialization/loading/render atomic, with exact error retention and deterministic retry: ok");
