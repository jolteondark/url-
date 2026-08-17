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

console.log("Safari first and later Board clicks share one real owner path with exact error retention and post-render scene trace: ok");
