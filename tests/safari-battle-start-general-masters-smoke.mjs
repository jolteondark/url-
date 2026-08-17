import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const demand = await readFile(new URL("../runtime/safari-general-data-demand.js", import.meta.url), "utf8");
const preview = await readFile(new URL("../preview.js", import.meta.url), "utf8");
const combatStart = await readFile(new URL("../runtime/safari-web-combat-start.js", import.meta.url), "utf8");

assert.match(demand, /if \(!safariGeneralMastersInstalled\(\)\) return false/,
  "combat readiness must include GENERAL master installation");
assert.match(demand, /await ensureSafariGeneralData\(\);/,
  "combat demand must install GENERAL masters before battle materialization");
assert.match(combatStart, /SAFARI_SPECIES_MASTERS\[input\?\.species\]/,
  "battle start still materializes opponents from canonical GENERAL species masters");
assert.match(combatStart, /SAFARI_MOVE_MASTERS\[id\]/,
  "battle start still validates canonical GENERAL move masters");
assert.match(preview, /safariGeneralCombatReady\(cell\.kind\)/,
  "initial board click must wait for the event-specific combat dependency set");
assert.match(preview, /ensureSafariGeneralCombatData\(cell\.kind\)/,
  "initial board click must load the event-specific GENERAL combat dependency set");
assert.match(preview, /globalThis\.__maplessLastError = error/,
  "battle-start failures must remain inspectable instead of being hidden by presentation");
assert.match(preview, /ゲームの読み込みに失敗しました: /,
  "the concrete battle-start error message must remain visible to the player");

console.log("Safari battle-start GENERAL master gate smoke passed");
