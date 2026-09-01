import fs from "node:fs";
import assert from "node:assert/strict";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const loader = fs.readFileSync(new URL("../deferred-ui-loader.js", import.meta.url), "utf8");
const battleUiBridge = fs.readFileSync(new URL("../canonical-battle-ui-bridge.js", import.meta.url), "utf8");

const loaderDelivery = html.match(/deferred-ui-loader\.js\?v=(\d{8}-\d{4})/);
const battleRevision = loader.match(/BATTLE_PRESENTATION_PUBLIC_REVISION = "(\d{8}-\d{4})"/);
const trainerSpriteRevision = battleUiBridge.match(/trainer-battle-canonical-sprite\.js\?v=(\d{8}-\d{4})/);

assert.ok(loaderDelivery, "index.html must cache-bust deferred-ui-loader.js");
assert.ok(battleRevision, "deferred loader must expose the shared Battle presentation revision");
assert.ok(trainerSpriteRevision, "Battle UI bridge must cache-bust the nested canonical trainer sprite bridge");
assert.ok(
  loaderDelivery[1] >= battleRevision[1],
  `deferred loader delivery pin ${loaderDelivery[1]} must not predate Battle presentation revision ${battleRevision[1]}`,
);
assert.equal(
  trainerSpriteRevision[1],
  battleRevision[1],
  "nested trainer sprite bridge must ship on the current Battle presentation public revision",
);
assert.ok(!html.includes("deferred-ui-loader.js?v=20260901-1231"), "stale pre-Battle-convergence loader pin must not return");

console.log(`battle presentation loader delivery smoke: ok (${loaderDelivery[1]} >= ${battleRevision[1]}, trainer ${trainerSpriteRevision[1]})`);
