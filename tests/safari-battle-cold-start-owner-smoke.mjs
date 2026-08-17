import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Keep GENERAL cold during module import. The browser defines window, so this
// reproduces the path that the iPhone uses before the first combat cell is
// activated instead of benefiting from the Node-only eager combat bootstrap.
globalThis.window = {};

const {
  activateSafariDayBoardCell,
  createSafariPlayableRuntime,
} = await import("../runtime/safari-web-playable-integration.js");
const {
  safariGeneralCombatReady,
} = await import("../runtime/safari-general-data-demand.js");

assert.equal(safariGeneralCombatReady("wild"), false,
  "cold browser-like startup must begin without the wild combat module");

const runtime = createSafariPlayableRuntime();
const state = runtime.variables.mapless;
state.board_events[0] = { kind: "wild", type: "ELECTRIC", slot: 0 };
state.board_consumed[0] = false;
state.board_revealed[0] = true;
state.board_visited[0] = false;

const start = await activateSafariDayBoardCell(runtime, 0);
assert.equal(start.result, "dispatched");
assert.equal(safariGeneralCombatReady("wild"), true,
  "the combat owner must load the exact wild dependency from a cold browser-like state");
assert.ok(state.battle, "cold board activation must create Battle state");
assert.equal(state.battle.kind, "wild");
assert.equal(state.battle.completed, false);
assert.ok(state.battle.foe?.species, "cold Battle start must materialize a foe");
assert.equal(globalThis.__maplessLastError, null,
  "a successful cold Battle start must clear stale startup errors");

const combatSource = await readFile(new URL("../runtime/safari-web-combat-start.js", import.meta.url), "utf8");
assert.match(combatSource, /await ensureSafariGeneralCombatData\(event\.kind\)/,
  "cold combat demand must remain inside the Battle-start owner and use the selected event kind");
assert.match(combatSource, /state\.battle[\s\S]*safari-runtime-changed/,
  "Battle state creation must publish a runtime change for scene-bundle synchronization");

const previewSource = await readFile(new URL("../preview-app.js", import.meta.url), "utf8");
assert.match(previewSource, /card\.hidden = !battle/,
  "core Battle visibility must be driven directly by Battle state");
assert.match(previewSource, /button\.dataset\.moveId = id/,
  "core Battle rendering must create tappable owner-backed move buttons");
assert.match(previewSource, /window\.addEventListener\("safari-runtime-changed", render\)/,
  "the loaded playable app must render directly from the runtime-change handoff used by Battle start");

const bootSource = await readFile(new URL("../preview.js", import.meta.url), "utf8");
assert.match(bootSource,
  /await activateSafariDayBoardCell\(runtime, index\);[\s\S]*await ensureInitialSceneHandoff\(state\)/,
  "first-board Battle state creation must be followed by an explicit scene handoff");
assert.match(bootSource,
  /safari-runtime-changed[\s\S]*requestAnimationFrame[\s\S]*battle-card[\s\S]*button\[data-move-id\]/,
  "first-entry handoff must wait for runtime-driven render and verify both scene visibility and move controls");
assert.match(bootSource, /__maplessBattleStartTrace = trace/,
  "first-entry handoff must retain stage diagnostics without replacing the runtime exception surface");
assert.match(bootSource, /pageshowFallbackUsed/,
  "legacy pageshow rendering may remain only as a conservative fallback during blocker recovery");

console.log("Safari cold board -> Battle owner -> runtime render handoff -> first scene/move handoff smoke passed");
