import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const adapter = readFileSync(new URL("../runtime/canonical-battle-ui-assets.js", import.meta.url), "utf8");
const preview = readFileSync(new URL("../preview.js", import.meta.url), "utf8");
const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");

assert.match(
  adapter,
  /#battle-card\[data-canonical-battle-ui=\\?"error\\?"\] \.battle-info-panel,[\s\S]*?#battle-card\[data-canonical-battle-ui=\\?"error\\?"\] \.battle-command-panel[\s\S]*?visibility:\s*hidden\s*!important/,
  "canonical Battle UI error state must hide both databoxes and the complete synthetic command panel",
);

const catchBlock = adapter.match(/catch \(error\) \{([\s\S]*?)\n  \}/)?.[1] ?? "";
assert.match(catchBlock, /installCanonicalBattleUiStyle\(documentRef\);/, "asset delivery failure must install fail-closed style before surfacing the error state");
assert.match(catchBlock, /card\.dataset\.canonicalBattleUi = "error";/, "asset delivery failure must remain diagnosable on the Battle card");
assert.match(catchBlock, /globalThis\.__maplessLastError =/, "asset delivery failure must remain available to diagnostics");

const preloadIndex = adapter.indexOf("await Promise.all(Object.values(CANONICAL_BATTLE_UI_ASSETS).map(preloadCanonicalBattleUiAsset))");
const readyStyleIndex = adapter.indexOf("installCanonicalBattleUiStyle(documentRef);", preloadIndex);
const readyIndex = adapter.indexOf('card.dataset.canonicalBattleUi = "ready";', readyStyleIndex);
assert.ok(preloadIndex >= 0 && readyStyleIndex > preloadIndex && readyIndex > readyStyleIndex, "success path must still preload canonical assets before exposing ready presentation");

assert.match(preview, /canonical-battle-ui-assets\.js\?v=20260905-1500/, "reachable preview must request the complete fail-closed Battle UI adapter generation");
assert.doesNotMatch(preview, /canonical-battle-ui-assets\.js\?v=20260905-1400/, "reachable preview must not retain the partial fail-closed adapter generation");
assert.match(index, /preview\.js\?v=20260905-1500/, "public entry point must deliver the complete fail-closed Battle UI preview generation");
assert.doesNotMatch(index, /preview\.js\?v=20260905-1400/, "public entry point must not retain the stale preview generation");

console.log("canonical Battle UI fail-closed delivery smoke: ok");
