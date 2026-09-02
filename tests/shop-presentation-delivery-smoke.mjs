import assert from "node:assert/strict";
import fs from "node:fs";

const loader = fs.readFileSync(new URL("../deferred-ui-loader.js", import.meta.url), "utf8");

const cssRevision = loader.match(/loadStyle\("\.\/shop-touch-presentation\.css\?v=([0-9-]+)"\)/)?.[1];
const jsRevision = loader.match(/loadModule\("\.\/shop-touch-presentation\.js\?v=([0-9-]+)"\)/)?.[1];

assert.ok(cssRevision, "reachable shop presentation CSS must have an explicit public revision");
assert.ok(jsRevision, "reachable shop presentation JS must have an explicit public revision");
assert.equal(cssRevision, jsRevision, "shop presentation CSS and JS revisions must move together");
assert.ok(!loader.includes('loadStyle("./shop-touch-presentation.css");'), "unversioned shop CSS delivery must not return");
assert.ok(!loader.includes('loadModule("./shop-touch-presentation.js");'), "unversioned shop JS delivery must not return");

console.log(`shop presentation delivery smoke: ok ${cssRevision}`);
