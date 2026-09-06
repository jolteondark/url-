import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const adapter = readFileSync(new URL("../runtime/canonical-battle-ui-assets.js", import.meta.url), "utf8");
const preview = readFileSync(new URL("../preview.js", import.meta.url), "utf8");
const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");

assert.match(
  adapter,
  /#battle-card\[data-canonical-battle-ui=\\?"loading\\?"\] \.battle-info-panel,[\s\S]*?#battle-card\[data-canonical-battle-ui=\\?"loading\\?"\] \.battle-command-panel,[\s\S]*?#battle-card\[data-canonical-battle-ui=\\?"loading\\?"\] \.battle-message,[\s\S]*?#battle-card\[data-canonical-battle-ui=\\?"error\\?"\] \.battle-info-panel,[\s\S]*?#battle-card\[data-canonical-battle-ui=\\?"error\\?"\] \.battle-command-panel,[\s\S]*?#battle-card\[data-canonical-battle-ui=\\?"error\\?"\] \.battle-message[\s\S]*?visibility:\s*hidden\s*!important/,
  "canonical Battle UI loading and error states must hide databoxes, command panel, and the synthetic message box",
);

const installBlock = adapter.match(/export async function installCanonicalBattleUiAssets[\s\S]*?\n}\n\nexport \{/)?.[0] ?? "";
const loadingIndex = installBlock.indexOf('card.dataset.canonicalBattleUi = "loading";');
const loadingStyleIndex = installBlock.indexOf("installCanonicalBattleUiStyle(documentRef);", loadingIndex);
const preloadIndex = installBlock.indexOf("await Promise.all(CANONICAL_BATTLE_UI_REQUIRED_ASSET_KEYS.map", loadingStyleIndex);
const fightTypeIndex = installBlock.indexOf("installCanonicalFightCursorTypePresentation(documentRef);", preloadIndex);
const fightCursorIndex = installBlock.indexOf("await installCanonicalBattleFightCursor(card);", preloadIndex);
const readyIndex = installBlock.indexOf('card.dataset.canonicalBattleUi = "ready";', fightCursorIndex);
assert.ok(
  loadingIndex >= 0 && loadingStyleIndex > loadingIndex && preloadIndex > loadingStyleIndex && fightTypeIndex > preloadIndex && fightCursorIndex > fightTypeIndex && readyIndex > fightCursorIndex,
  "required canonical Battle UI must preload fail-closed, install live move-type presentation, isolate the fight cursor probe, then become ready",
);

assert.doesNotMatch(
  installBlock,
  /Promise\.all\(Object\.values\(CANONICAL_BATTLE_UI_ASSETS\)/,
  "a missing fight cursor must not reject the entire canonical Battle UI preload",
);
assert.match(adapter, /CANONICAL_BATTLE_UI_REQUIRED_ASSET_KEYS[\s\S]*?"commandCursor"[\s\S]*?\]\);/, "core canonical Battle UI assets must retain an explicit required set");
assert.doesNotMatch(adapter.match(/CANONICAL_BATTLE_UI_REQUIRED_ASSET_KEYS = Object\.freeze\(\[([\s\S]*?)\]\);/)?.[1] ?? "", /fightCursor/, "fight cursor must remain outside the core required preload");
assert.match(adapter, /card\.dataset\.canonicalBattleFightCursor = "error";/, "missing canonical fight cursor must fail closed on its own presentation state");
assert.match(adapter, /rememberCanonicalBattleUiDiagnostic\("fightCursor", "unavailable", src, error\)/, "missing fight cursor must remain diagnosable");
assert.match(adapter, /data-canonical-battle-fight-cursor=\\?"ready\\?"[\s\S]*?--canonical-battle-fight-cursor/, "fight cursor CSS must only activate after the canonical binary loads");

const catchBlock = installBlock.match(/catch \(error\) \{([\s\S]*?)\n  \}/)?.[1] ?? "";
assert.match(catchBlock, /card\.dataset\.canonicalBattleUi = "error";/, "core asset delivery failure must remain diagnosable on the Battle card");
assert.match(catchBlock, /globalThis\.__maplessLastError =/, "core asset delivery failure must remain available to diagnostics");

assert.match(adapter, /button\[data-dppt-command=\\?"fight\\?"\][^{]*\{\s*--canonical-command-cursor-y:\s*0%/s, "FIGHT must use canonical command cursor row 0");
assert.match(adapter, /button\[data-dppt-command=\\?"party\\?"\][^{]*\{\s*--canonical-command-cursor-y:\s*11\.111111%/s, "PARTY must use canonical command cursor row 1");
assert.match(adapter, /button\[data-dppt-command=\\?"bag\\?"\][^{]*\{\s*--canonical-command-cursor-y:\s*22\.222222%/s, "BAG must use canonical command cursor row 2");
assert.match(adapter, /button\[data-dppt-command=\\?"flee\\?"\][^{]*\{\s*--canonical-command-cursor-y:\s*33\.333333%/s, "RUN must use canonical command cursor row 3");
assert.match(adapter, /background-position:\s*100%\s+var\(--canonical-command-cursor-y,\s*0%\)\s*!important/, "selected command cursor must use the selected spritesheet column");
assert.match(adapter, /background-size:\s*200%\s+1000%\s*!important/, "canonical command cursor must slice the 2-column by 10-row spritesheet instead of shrinking the full sheet");

assert.match(adapter, /import \{ SAFARI_MOVE_PRESENTATION \} from "\.\/safari-move-presentation-live\.js";/, "fight cursor presentation must consume the existing move presentation owner signal");
for (const [type, position] of Object.entries({ NORMAL:0, FIGHTING:1, FLYING:2, POISON:3, GROUND:4, ROCK:5, BUG:6, GHOST:7, STEEL:8, QMARKS:9, FIRE:10, WATER:11, GRASS:12, ELECTRIC:13, PSYCHIC:14, ICE:15, DRAGON:16, DARK:17, FAIRY:18 })) {
  assert.match(adapter, new RegExp(`${type}:\\s*${position}`), `${type} must retain canonical IconPosition ${position}`);
}
assert.match(adapter, /button\.dataset\.canonicalFightCursorType = type;/, "reachable move buttons must receive canonical type presentation without changing mechanics state");
assert.match(adapter, /background-position:\s*100%\s+var\(--canonical-fight-cursor-y\)\s*!important/, "selected fight cursor must use the selected spritesheet column and canonical type row");
assert.match(adapter, /background-size:\s*200%\s+1900%\s*!important/, "canonical fight cursor must slice the 2-column by 19-row spritesheet instead of shrinking the full sheet");

assert.match(preview, /canonical-battle-ui-assets\.js\?v=20260906-0900/, "reachable preview must request the type-sliced Battle UI adapter generation");
assert.doesNotMatch(preview, /canonical-battle-ui-assets\.js\?v=20260906-0800/, "reachable preview must not retain the stale Battle UI adapter generation");
assert.match(index, /preview\.js\?v=20260906-0900/, "public entry point must deliver the preview generation that requests the type-sliced adapter");
assert.doesNotMatch(index, /preview\.js\?v=20260906-0800/, "public entry point must not retain the stale outer preview generation");

console.log("canonical Battle UI fail-closed delivery smoke: ok");
