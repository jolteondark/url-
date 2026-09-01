import fs from "node:fs";
import assert from "node:assert/strict";

const index = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const loader = fs.readFileSync(new URL("../deferred-ui-loader.js", import.meta.url), "utf8");

const loaderRevision = index.match(/deferred-ui-loader\.js\?v=(\d{8}-\d{4})/)?.[1];
const battleRevision = loader.match(/BATTLE_PRESENTATION_PUBLIC_REVISION = "(\d{8}-\d{4})"/)?.[1];

assert.equal(loaderRevision, "20260902-0008", "index must fetch the refreshed deferred UI loader");
assert.equal(battleRevision, "20260902-0008", "deferred loader must fetch refreshed Battle presentation entry modules");
for (const modulePath of [
  "./canonical-battle-ui-bridge.js",
  "./trainer-battle-presentation.js",
  "./canonical-battle-status-bridge.js",
  "./canonical-battleback-presentation-bridge.js",
]) {
  assert.ok(loader.includes(`battlePresentationUrl("${modulePath}")`), `${modulePath} must use the shared Battle public revision`);
}

console.log("battle presentation public delivery convergence smoke: ok");
