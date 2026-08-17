import fs from "node:fs/promises";
import assert from "node:assert/strict";

const source = await fs.readFile(new URL("../deferred-ui-loader.js", import.meta.url), "utf8");

assert.match(source, /globalThis\.__maplessSafariRuntime\?\.variables\?\.mapless/);
assert.doesNotMatch(source, /sceneIsVisible/);
assert.doesNotMatch(source, /getElementById\(["']battle-card["']\)/);
assert.doesNotMatch(source, /getElementById\(["']shop-card["']\)/);
assert.match(source, /if \(state\?\.battle\) loadBattleUi\(\);/);
assert.match(source, /if \(state\?\.shop\) loadShopUi\(\);/);

console.log("safari scene runtime directness smoke: ok");
