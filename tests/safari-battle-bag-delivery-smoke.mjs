import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const loader = await readFile(new URL("../deferred-ui-loader.js", import.meta.url), "utf8");
const menu = await readFile(new URL("../game-menu-bridge.js", import.meta.url), "utf8");

assert.match(index, /deferred-ui-loader\.js\?v=20260819-0115/,
  "the public shell must request the refreshed deferred UI loader");
assert.match(loader, /game-menu-bridge\.js\?v=20260819-0115/,
  "the refreshed loader must request the Battle Bag-capable menu module by a new URL");
assert.doesNotMatch(loader, /loadModule\("\.\/game-menu-bridge\.js"\)/,
  "the menu bridge must not fall back to the stale unversioned delivery URL");
assert.match(menu, /from "\.\/runtime\/safari-web-playable-integration\.js"/,
  "Battle Bag must share the same unversioned playable facade as preview-app");
assert.match(menu, /await useSafariBattleItem\(runtime, \{ itemId: use\.dataset\.bagUseItem, partyIndex \}\)/,
  "Battle Bag must submit exactly one command to the existing battle-item owner");
assert.match(menu, /if \(result\.turnConsumed\) close\(\)/,
  "a consumed Battle Bag command must close the menu instead of replaying the input");
assert.doesNotMatch(menu, /battle-menu-presentation\.js/,
  "the deleted stale Battle menu presentation import must not return");

console.log("Safari Battle Bag delivery smoke passed");
