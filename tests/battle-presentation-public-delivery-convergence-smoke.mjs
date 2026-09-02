import fs from "node:fs";
import assert from "node:assert/strict";

const index = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const loader = fs.readFileSync(new URL("../deferred-ui-loader.js", import.meta.url), "utf8");

const loaderRevision = index.match(/deferred-ui-loader\.js\?v=(\d{8}-\d{4})/)?.[1];
const battleRevision = loader.match(/BATTLE_PRESENTATION_PUBLIC_REVISION = "(\d{8}-\d{4})"/)?.[1];

assert.equal(loaderRevision, "20260903-0800", "index must fetch the refreshed deferred UI loader after Battle presentation changes");
assert.equal(battleRevision, "20260903-0700", "deferred loader must fetch the current Battle presentation generation");
for (const modulePath of [
  "./canonical-battle-ui-bridge.js",
  "./trainer-battle-presentation.js",
  "./canonical-battle-status-bridge.js",
  "./canonical-battleback-message-bridge.js",
  "./canonical-battleback-presentation-bridge.js",
]) {
  assert.ok(loader.includes(`battlePresentationUrl("${modulePath}")`), `${modulePath} must use the shared Battle public revision`);
}

console.log("battle presentation public delivery convergence smoke: ok");
