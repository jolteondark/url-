import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../preview.js", import.meta.url), "utf8");

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
  assert.match(source, new RegExp(`traceBattleStart\\(\\"${stage}\\"`), `missing first-Battle lifecycle stage: ${stage}`);
}

assert.match(source, /__maplessBattleStartLifecycleTrace = \[\]/,
  "each explicit first-board attempt must start a fresh lifecycle trace");
assert.match(source, /initial_board_activation_error[\s\S]*error_name[\s\S]*error_message[\s\S]*__maplessLastError = error/,
  "first-board failure must retain both stage diagnostics and the original Error object");
assert.match(source, /board_owner_ready[\s\S]*ensureInitialSceneHandoff/,
  "Battle owner completion must be followed by the scene/move-control handoff check");

console.log("Safari first-board Battle lifecycle trace smoke passed");
