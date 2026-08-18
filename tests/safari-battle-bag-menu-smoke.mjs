import assert from "node:assert/strict";
import fs from "node:fs";

const menu = fs.readFileSync(new URL("../game-menu-bridge.js", import.meta.url), "utf8");
const facade = fs.readFileSync(new URL("../runtime/safari-web-playable-integration.js", import.meta.url), "utf8");

assert.doesNotMatch(menu, /battle-menu-presentation\.js/,
  "game menu must not import the removed battle-menu presentation module");
assert.match(menu, /from "\.\/runtime\/safari-web-playable-integration\.js"/,
  "Battle Bag must share the unversioned Safari facade with preview-app");
assert.match(menu, /await useSafariBattleItem\(runtime, \{ itemId: use\.dataset\.bagUseItem, partyIndex \}\)/,
  "active Battle Potion must route through the existing Battle item owner");
assert.match(menu, /bagUseBusy = true;[\s\S]*bagUseBusy = false;/,
  "Battle Bag must lock repeated taps around the async owner call");
assert.match(menu, /battle\.player_replacement_required/,
  "Battle Bag must stay inert while replacement is required");
assert.match(menu, /battle\.origin === "boundary_trial"/,
  "Battle Bag must stay disabled when no boundary item owner exists");
assert.match(menu, /return !byId\("capture"\)\?\.disabled;/,
  "Battle Bag must reuse preview-app command busy state instead of adding mechanics state");
assert.doesNotMatch(menu, /Boolean\(runtime\.variables\?\.mapless\?\.battle\) \|\| Boolean\(runtime\.variables\?\.mapless\?\.shop\)/,
  "normal Battle must no longer blanket-disable Potion use");
assert.match(facade, /export async function useSafariBattleItem\(runtime, options = \{\}\)/,
  "shared facade must expose the existing Battle item owner");

console.log("Safari Battle Bag menu: loadable shared-facade Potion command with one async input lock: ok");
