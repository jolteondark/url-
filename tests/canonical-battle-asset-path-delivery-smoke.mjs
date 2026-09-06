import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const read = (path) => readFileSync(join(root, path), "utf8");
const requireFile = (path, label) => assert.ok(existsSync(join(root, path)), `${label} must exist at exact-case public path: ${path}`);

const battler = read("runtime/canonical-battle-battler-assets.js");
const ui = read("runtime/canonical-battle-ui-assets.js");
const battleback = read("runtime/canonical-battleback-assets.js");

function extractFrozenArray(source, name) {
  const body = source.match(new RegExp(`const ${name} = Object\\.freeze\\(\\[([\\s\\S]*?)\\]\\);`))?.[1] ?? "";
  return [...body.matchAll(/"([A-Z0-9_]+)"/g)].map((match) => match[1]);
}

for (const species of extractFrozenArray(battler, "CANONICAL_BATTLE_FRONT_SPECIES")) {
  requireFile(`assets/canonical-battle-sprites/front/${species}.png`, `canonical foe sprite ${species}`);
}
for (const species of extractFrozenArray(battler, "CANONICAL_BATTLE_BACK_SPECIES")) {
  requireFile(`assets/canonical-battle-sprites/back/${species}.png`, `canonical player back sprite ${species}`);
}

const uiAssetBlock = ui.match(/const CANONICAL_BATTLE_UI_ASSETS = Object\.freeze\(\{([\s\S]*?)\}\);/)?.[1] ?? "";
const uiPaths = [...uiAssetBlock.matchAll(/"(\.\/assets\/canonical-battle-ui\/[^"']+\.png)"/g)].map((match) => match[1].replace(/^\.\//, ""));
assert.ok(uiPaths.length >= 1, "canonical Battle UI asset map must expose concrete PNG paths");
for (const path of uiPaths) requireFile(path, "canonical Battle UI asset");

const battlebackPaths = [...battleback.matchAll(/"(\.\/assets\/canonical-battlebacks\/[^"']+\.png)"/g)].map((match) => match[1].replace(/^\.\//, ""));
assert.equal(new Set(battlebackPaths).size, 9, "canonical DAY/EVE/NIGHT battleback resolver must retain all 9 published PNGs");
for (const path of new Set(battlebackPaths)) requireFile(path, "canonical Battle background/base asset");

for (const source of [battler, ui, battleback]) {
  assert.doesNotMatch(source, /assets\/canonical-[^"'`]+\.(?:PNG|Png|pNg|pnG)/, "canonical asset URLs must preserve exact lowercase .png extension");
}

console.log("canonical Battle asset path delivery smoke: ok");
