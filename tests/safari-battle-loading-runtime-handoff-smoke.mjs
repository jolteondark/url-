import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../runtime/safari-web-combat-start.js", import.meta.url), "utf8");

const loadingNotice = source.indexOf('state.notice = "戦闘データを読み込んでいます…"');
const loadingNotify = source.indexOf("notifySafariRuntimeChanged();", loadingNotice);
const combatDemand = source.indexOf("await ensureSafariGeneralCombatData(event.kind);", loadingNotify);
assert.ok(loadingNotice >= 0, "combat owner must expose its loading notice");
assert.ok(loadingNotify > loadingNotice, "loading notice must publish through the runtime event before async GENERAL demand");
assert.ok(combatDemand > loadingNotify, "selected GENERAL demand must begin only after the loading state is publishable");

const battleReady = source.indexOf("if (state.battle) globalThis.__maplessLastError = null;");
const battleNotify = source.indexOf("if (state.battle) notifySafariRuntimeChanged();", battleReady);
assert.ok(battleReady >= 0 && battleNotify > battleReady, "Battle state must publish a second runtime event after materialization");

const catchStart = source.indexOf("} catch (error) {");
const restoreNotice = source.indexOf("state.notice = previousNotice;", catchStart);
const errorNotify = source.indexOf("notifySafariRuntimeChanged();", restoreNotice);
const rethrow = source.indexOf("throw error;", errorNotify);
assert.ok(restoreNotice > catchStart, "failed combat demand must restore the prior Board notice");
assert.ok(errorNotify > restoreNotice && rethrow > errorNotify, "failed loading must repaint the restored Board state and preserve the exact thrown Error");

console.log("Safari Battle loading -> owner demand -> Battle/error runtime handoff: ok");
