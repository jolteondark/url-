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
const preloadIndex = installBlock.indexOf("await Promise.all(Object.values(CANONICAL_BATTLE_UI_ASSETS).map(preloadCanonicalBattleUiAsset))", loadingStyleIndex);
const readyIndex = installBlock.indexOf('card.dataset.canonicalBattleUi = "ready";', preloadIndex);
assert.ok(
  loadingIndex >= 0 && loadingStyleIndex > loadingIndex && preloadIndex > loadingStyleIndex && readyIndex > preloadIndex,
  "fail-closed style must be installed before canonical Battle UI preload starts, and ready must remain gated on successful preload",
);

const catchBlock = adapter.match(/catch \(error\) \{([\s\S]*?)\n  \}/)?.[1] ?? "";
assert.match(catchBlock, /card\.dataset\.canonicalBattleUi = "error";/, "asset delivery failure must remain diagnosable on the Battle card");
assert.match(catchBlock, /globalThis\.__maplessLastError =/, "asset delivery failure must remain available to diagnostics");

assert.match(adapter, /button\[data-dppt-command=\\?"fight\\?"\][^{]*\{\s*--canonical-command-cursor-y:\s*0%/s, "FIGHT must use canonical command cursor row 0");
assert.match(adapter, /button\[data-dppt-command=\\?"party\\?"\][^{]*\{\s*--canonical-command-cursor-y:\s*11\.111111%/s, "PARTY must use canonical command cursor row 1");
assert.match(adapter, /button\[data-dppt-command=\\?"bag\\?"\][^{]*\{\s*--canonical-command-cursor-y:\s*22\.222222%/s, "BAG must use canonical command cursor row 2");
assert.match(adapter, /button\[data-dppt-command=\\?"flee\\?"\][^{]*\{\s*--canonical-command-cursor-y:\s*33\.333333%/s, "RUN must use canonical command cursor row 3");
assert.match(adapter, /background-position:\s*100%\s+var\(--canonical-command-cursor-y,\s*0%\)\s*!important/, "selected command cursor must use the selected spritesheet column");
assert.match(adapter, /background-size:\s*200%\s+1000%\s*!important/, "canonical command cursor must slice the 2-column by 10-row spritesheet instead of shrinking the full sheet");

assert.match(preview, /canonical-battle-ui-assets\.js\?v=20260906-0700/, "reachable preview must request the command-cursor-fixed Battle UI adapter generation");
assert.doesNotMatch(preview, /canonical-battle-ui-assets\.js\?v=20260906-0100/, "reachable preview must not retain the stale Battle UI adapter generation");
assert.match(index, /preview\.js\?v=20260906-0700/, "public entry point must deliver the preview generation that requests the command-cursor-fixed Battle UI adapter");
assert.doesNotMatch(index, /preview\.js\?v=20260906-0600/, "public entry point must not retain the stale outer preview generation");

console.log("canonical Battle UI fail-closed delivery smoke: ok");
