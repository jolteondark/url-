import assert from "node:assert/strict";
import fs from "node:fs";

const menu = fs.readFileSync(new URL("../game-menu-bridge.js", import.meta.url), "utf8");
const facade = fs.readFileSync(new URL("../runtime/safari-web-playable-integration.js", import.meta.url), "utf8");

assert.doesNotMatch(menu, /battle-menu-presentation\.js/,
  "game menu must not statically import the removed battle-menu presentation module");
assert.match(menu, /from "\.\/runtime\/safari-web-playable-integration\.js"/,
  "Bag Battle command must share the same unversioned Safari facade as preview-app");
assert.match(menu, /useSafariBattleItem/,
  "Battle Bag must call the existing Battle item owner instead of field-use mechanics");
assert.match(menu, /if \(battle\) \{[\s\S]*await useSafariBattleItem\(runtime, \{ itemId: use\.dataset\.bagUseItem, partyIndex \}\)/,
  "active Battle Bag use must route through the owner with the selected target");
assert.match(menu, /bagUseBusy = true;[\s\S]*finally \{[\s\S]*bagUseBusy = false;/,
  "Battle Bag must lock double taps for the full async command");
assert.match(menu, /battle\.player_replacement_required/,
  "Bag must stay inert while the owner requires player replacement");
assert.match(menu, /battle\.origin === "boundary_trial"/,
  "Bag must stay disabled where no boundary Battle item owner exists");
assert.match(menu, /return !byId\("capture"\)\?\.disabled;/,
  "Bag must reuse preview-app command busy state instead of inventing another Battle phase truth");
assert.doesNotMatch(menu, /Boolean\(runtime\.variables\?\.mapless\?\.battle\) \|\| Boolean\(runtime\.variables\?\.mapless\?\.shop\)/,
  "active normal Battle must no longer blanket-disable Potion use");
assert.match(facade, /export async function useSafariBattleItem\(runtime, options = \{\}\)/,
  "shared facade must continue exposing the canonical-derived Battle item owner");

console.log("Safari Battle Bag menu: loadable single-facade Potion command with one async input lock: ok");
