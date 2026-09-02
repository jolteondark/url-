import assert from "node:assert/strict";
import fs from "node:fs";

const loader = fs.readFileSync(new URL("../deferred-ui-loader.js", import.meta.url), "utf8");

const boardCssRevision = loader.match(/loadStyle\("\.\/game-presentation\.css\?v=([0-9-]+)"\)/)?.[1];
const shellCssRevision = loader.match(/loadStyle\("\.\/bridge-shell\.css\?v=([0-9-]+)"\)/)?.[1];
const menuCssRevision = loader.match(/loadStyle\("\.\/game-menu\.css\?v=([0-9-]+)"\)/)?.[1];

assert.ok(boardCssRevision, "reachable Board presentation CSS must have an explicit public revision");
assert.ok(shellCssRevision, "reachable Menu shell CSS must have an explicit public revision");
assert.ok(menuCssRevision, "reachable Menu presentation CSS must have an explicit public revision");
assert.equal(shellCssRevision, menuCssRevision, "Menu shell and Menu presentation CSS revisions must move together");
assert.ok(!loader.includes('loadStyle("./game-presentation.css");'), "unversioned Board presentation CSS delivery must not return");
assert.ok(!loader.includes('loadStyle("./bridge-shell.css");'), "unversioned Menu shell CSS delivery must not return");
assert.ok(!loader.includes('loadStyle("./game-menu.css");'), "unversioned Menu presentation CSS delivery must not return");

console.log(`board/menu presentation delivery smoke: ok board=${boardCssRevision} menu=${menuCssRevision}`);
