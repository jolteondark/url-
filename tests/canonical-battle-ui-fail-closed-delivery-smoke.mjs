import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const adapter = readFileSync(new URL("../runtime/canonical-battle-ui-assets.js", import.meta.url), "utf8");
const preview = readFileSync(new URL("../preview.js", import.meta.url), "utf8");
const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");

assert.match(
  adapter,
  /#battle-card\[data-canonical-battle-ui=\\?"loading\\?"\] \.battle-info-panel,[\s\S]*?#battle-card\[data-canonical-battle-ui=\\?"loading\\?"\] \.battle-command-panel,[\s\S]*?#battle-card\[data-canonical-battle-ui=\\?"error\\?"\] \.battle-info-panel,[\s\S]*?#battle-card\[data-canonical-battle-ui=\\?"error\\?"\] \.battle-command-panel[\s\S]*?visibility:\s*hidden\s*!important/,
  "canonical Battle UI loading and error states must hide both databoxes and the complete synthetic command panel",
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

assert.match(preview, /canonical-battle-ui-assets\.js\?v=20260905-1600/, "reachable preview must request the loading fail-closed Battle UI adapter generation");
assert.doesNotMatch(preview, /canonical-battle-ui-assets\.js\?v=20260905-1500/, "reachable preview must not retain the stale Battle UI adapter generation");
assert.match(index, /preview\.js\?v=20260905-1600/, "public entry point must deliver the loading fail-closed preview generation");
assert.doesNotMatch(index, /preview\.js\?v=20260905-1500/, "public entry point must not retain the stale preview generation");

console.log("canonical Battle UI fail-closed delivery smoke: ok");
