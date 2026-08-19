import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const loader = await readFile(new URL("../deferred-ui-loader.js", import.meta.url), "utf8");
const menu = await readFile(new URL("../game-menu-bridge.js", import.meta.url), "utf8");
const narration = await readFile(new URL("../battle-presentation-narration.js", import.meta.url), "utf8");

assert.match(index, /deferred-ui-loader\.js\?v=20260819-1650/,
  "the public shell must request the orchestrator-aware deferred UI loader");
assert.match(loader, /game-menu-bridge\.js\?v=20260819-1650/,
  "the refreshed loader must request the orchestrator-aware Battle Bag module");
assert.doesNotMatch(loader, /loadModule\("\.\/game-menu-bridge\.js"\)/,
  "the menu bridge must not fall back to the stale unversioned delivery URL");
assert.match(menu, /from "\.\/runtime\/safari-web-playable-integration\.js"/,
  "Battle Bag must share the same unversioned playable facade as preview-app");
assert.match(menu, /SAFARI_BATTLE_PHASE, completeSafariBattlePresentation/,
  "Battle Bag UI must consume the central orchestrator phase and completion owner");
assert.match(menu, /battle\.phase === SAFARI_BATTLE_PHASE\.COMMAND/,
  "Battle Bag input is legal only during COMMAND");
assert.doesNotMatch(menu, /battle\.completed|player_replacement_required|capture"\)\?\.disabled/,
  "Battle Bag must not reconstruct phase from completed/replacement/DOM busy state");
assert.doesNotMatch(menu, /setBattleControlsDisabled/,
  "Battle Bag must not own a second Battle command-lock implementation");
assert.match(menu, /await useSafariBattleItem\(runtime, \{ itemId: use\.dataset\.bagUseItem, partyIndex \}\)/,
  "Battle Bag must submit exactly one command to the existing battle-item owner");
assert.match(menu, /event\.type === "battle_item"/,
  "Battle Bag presentation must visibly apply the owner-reported heal before the foe response");
assert.match(menu, /await playBattleItemPresentation\(runtime, result\.presentation \?\? \[\]\);\s*completeSafariBattlePresentation\(runtime, result\)/s,
  "owner presentation must drain before the central orchestrator is released to COMMAND/RESULT");
assert.match(menu, /if \(result\.turnConsumed\) \{\s*close\(\);/s,
  "a consumed Battle Bag command must close the menu instead of replaying input");
assert.match(narration, /case "battle_item":/,
  "the shared Battle narration must describe the item event before the foe response");
assert.doesNotMatch(menu, /battle-menu-presentation\.js/,
  "the deleted stale Battle menu presentation import must not return");

console.log("Safari Battle Bag orchestrator delivery smoke passed");
