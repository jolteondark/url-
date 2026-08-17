import assert from "node:assert/strict";
import fs from "node:fs";

const loader = fs.readFileSync(new URL("../deferred-ui-loader.js", import.meta.url), "utf8");

assert.match(loader, /async function loadBattleUi\(\)/);
assert.match(loader, /loadModule\("\.\/canonical-battle-sprite-bridge\.js"\)/);
assert.doesNotMatch(loader, /loadModule\("\.\/canonical-battle-ui-bridge\.js"\)/);
assert.doesNotMatch(loader, /loadModule\("\.\/canonical-battle-status-bridge\.js"\)/);
assert.doesNotMatch(loader, /loadModule\("\.\/trainer-battle-presentation\.js"\)/);
assert.doesNotMatch(loader, /loadStyle\("\.\/canonical-battle-ui\.css"\)/);
assert.doesNotMatch(loader, /loadStyle\("\.\/canonical-battle-status\.css"\)/);
assert.doesNotMatch(loader, /loadStyle\("\.\/trainer-battle-presentation\.css"\)/);

console.log("Safari minimal battle UI bundle: PASS");
