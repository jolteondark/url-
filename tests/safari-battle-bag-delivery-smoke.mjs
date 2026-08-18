import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const loader = await readFile(new URL("../deferred-ui-loader.js", import.meta.url), "utf8");
const menu = await readFile(new URL("../game-menu-bridge.js", import.meta.url), "utf8");
const narration = await readFile(new URL("../battle-presentation-narration.js", import.meta.url), "utf8");

assert.match(index, /deferred-ui-loader\.js\?v=20260819-0225/,
  "the public shell must request the refreshed deferred UI loader");
assert.match(loader, /game-menu-bridge\.js\?v=20260819-0225/,
  "the refreshed loader must request the Battle Bag presentation-capable menu module by a new URL");
assert.doesNotMatch(loader, /loadModule\("\.\/game-menu-bridge\.js"\)/,
  "the menu bridge must not fall back to the stale unversioned delivery URL");
assert.match(menu, /from "\.\/runtime\/safari-web-playable-integration\.js"/,
  "Battle Bag must share the same unversioned playable facade as preview-app");
assert.match(menu, /await useSafariBattleItem\(runtime, \{ itemId: use\.dataset\.bagUseItem, partyIndex \}\)/,
  "Battle Bag must submit exactly one command to the existing battle-item owner");
assert.match(menu, /setBattleControlsDisabled\(true\)/,
  "Battle controls must be locked before the Battle Bag owner is invoked");
assert.match(menu, /await playBattleItemPresentation\(runtime, result\.presentation \?\? \[\]\)/,
  "a consumed Battle Bag command must play the owner presentation before unlocking controls");
assert.match(menu, /if \(result\.turnConsumed\) \{\s*close\(\);/s,
  "a consumed Battle Bag command must close the menu instead of replaying the input");
assert.match(narration, /case "battle_item":/,
  "the shared Battle narration must describe the item event before the foe response");
assert.doesNotMatch(menu, /battle-menu-presentation\.js/,
  "the deleted stale Battle menu presentation import must not return");

console.log("Safari Battle Bag delivery smoke passed");
