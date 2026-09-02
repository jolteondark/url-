import assert from "node:assert/strict";
import fs from "node:fs";

const loader = fs.readFileSync(new URL("../deferred-ui-loader.js", import.meta.url), "utf8");

const publicRevision = loader.match(/const MENU_SPRITE_PRESENTATION_PUBLIC_REVISION = "([0-9-]+)"/)?.[1];
assert.ok(publicRevision, "Menu sprite presentation must expose an explicit public revision");

for (const moduleName of ["storage-panel-bridge.js", "species-form-metadata-bridge.js", "species-sprite-atlas-bridge.js"]) {
  assert.ok(
    loader.includes(`loadModule(\`./${moduleName}?v=\${MENU_SPRITE_PRESENTATION_PUBLIC_REVISION}\`)`),
    `${moduleName} must use the shared Menu sprite presentation revision`,
  );
  assert.ok(!loader.includes(`loadModule("./${moduleName}")`), `${moduleName} must not return to unversioned delivery`);
}

console.log(`menu storage/species presentation delivery smoke: ok revision=${publicRevision}`);
