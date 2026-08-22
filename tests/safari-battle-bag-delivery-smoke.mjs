import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const loader = await readFile(new URL("../deferred-ui-loader.js", import.meta.url), "utf8");
const menu = await readFile(new URL("../game-menu-bridge.js", import.meta.url), "utf8");
const narration = await readFile(new URL("../battle-presentation-narration.js", import.meta.url), "utf8");
const fleeAdapter = await readFile(new URL("../battle-dppt-flee-owner-request.js", import.meta.url), "utf8");
const playable = await readFile(new URL("../runtime/safari-web-playable-integration.js", import.meta.url), "utf8");

assert.match(index, /deferred-ui-loader\.js\?v=20260820-0834/,
  "the public shell must request the refreshed deferred UI loader");
assert.match(loader, /game-menu-bridge\.js\?v=20260820-0834/,
  "the refreshed loader must request the Battle Bag command-locking menu module by a new URL");
assert.doesNotMatch(loader, /loadModule\("\.\/game-menu-bridge\.js"\)/,
  "the menu bridge must not fall back to the stale unversioned delivery URL");
assert.match(menu, /from "\.\/runtime\/safari-web-playable-integration\.js"/,
  "Battle Bag must share the same unversioned playable facade as preview-app");
assert.match(menu, /await useSafariBattleItem\(runtime, \{ itemId: use\.dataset\.bagUseItem, partyIndex \}\)/,
  "Battle Bag must submit exactly one command to the existing battle-item owner");
assert.match(menu, /setBattleControlsDisabled\(true\)/,
  "Battle controls must be locked before the Battle Bag owner is invoked");
assert.match(menu, /if \(moves\) moves\.inert = disabled/,
  "the move command region must stay inert even if preview-app re-renders its child buttons during the Bag turn");
assert.match(menu, /button\.inert = disabled;\s*button\.disabled = disabled;/s,
  "capture and flee must remain physically inert as well as visually disabled during the Bag turn");
assert.match(menu, /event\.type === "battle_item"/,
  "Battle Bag presentation must visibly apply the owner-reported heal before the foe response");
assert.match(menu, /await playBattleItemPresentation\(runtime, result\.presentation \?\? \[\]\)/,
  "a consumed Battle Bag command must play the owner presentation before unlocking controls");
assert.match(menu, /bagUseBusy = false;\s*setBattleControlsDisabled\(false\);\s*window\.dispatchEvent\(new CustomEvent\("safari-runtime-changed"\)\)/s,
  "Battle Bag controls must only be released after owner resolution and presentation complete, then let the canonical runtime render reconcile replacement/result state");
assert.match(menu, /if \(result\.turnConsumed\) \{\s*close\(\);/s,
  "a consumed Battle Bag command must close the menu instead of replaying the input");
assert.match(narration, /case "battle_item":/,
  "the shared Battle narration must describe the item event before the foe response");
assert.doesNotMatch(menu, /battle-menu-presentation\.js/,
  "the deleted stale Battle menu presentation import must not return");

assert.match(playable,
  /let result = useSafariNormalBattleItem\(runtime, options\);\s*if \(stateOf\(runtime\)\.battle\) result = commitNormalBattleCommand\(runtime, result, "item", commandAttempt\);/s,
  "Battle Bag must return the central committed resolution rather than the stale pre-orchestrator result");
assert.match(playable,
  /let result = attemptSafariNormalCapture\(runtime, options\);[\s\S]*?result = commitSafariBattleResolution\(runtime, result, "capture", \{/,
  "Capture must return the central committed RESULT/reward snapshot rather than the stale pre-orchestrator result");

const fleeAdapterIndex = index.indexOf("battle-dppt-flee-owner-request.js?v=20260820-1034");
const commandMenuIndex = index.indexOf("battle-dppt-command-menu.js?v=20260820-0934");
assert.ok(fleeAdapterIndex >= 0 && commandMenuIndex > fleeAdapterIndex,
  "the direct flee adapter must capture the DPt Run input before the legacy command-menu relay can observe it");
assert.match(fleeAdapter, /attemptSafariFlee\(currentRuntime\)/,
  "DPt Run must delegate exactly once to the existing flee mechanics owner");
assert.match(fleeAdapter, /if \(fleeBusy\) return;/,
  "DPt Run must synchronously reject duplicate submissions while the owner/presentation is resolving");
assert.match(fleeAdapter, /event\.preventDefault\(\);\s*event\.stopImmediatePropagation\(\);\s*requestFlee\(button\);/s,
  "DPt Run must consume the visible control directly instead of replaying a hidden control");
assert.doesNotMatch(fleeAdapter, /\.click\(\)/,
  "the direct flee adapter must not use synthetic click replay");
assert.match(fleeAdapter, /currentBattle\?\.phase !== "COMMAND"/,
  "DPt Run availability must consume the central COMMAND phase rather than infer a second busy truth");
assert.match(fleeAdapter, /restoreCommandRootIfReady\(\)/,
  "a nonterminal failed Run must automatically restore the unique COMMAND root after owner presentation completes");
assert.match(index, /canonical browser integration \/ v0\.9\.108 · build 20260820-1034/,
  "the shell build label must expose the direct-flee delivery refresh");

console.log("Safari Battle Bag and direct DPt flee delivery smoke passed");
