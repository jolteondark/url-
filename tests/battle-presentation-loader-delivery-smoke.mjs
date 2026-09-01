import fs from "node:fs";
import assert from "node:assert/strict";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const loader = fs.readFileSync(new URL("../deferred-ui-loader.js", import.meta.url), "utf8");

const loaderDelivery = html.match(/deferred-ui-loader\.js\?v=(\d{8}-\d{4})/);
const battleRevision = loader.match(/BATTLE_PRESENTATION_PUBLIC_REVISION = "(\d{8}-\d{4})"/);

assert.ok(loaderDelivery, "index.html must cache-bust deferred-ui-loader.js");
assert.ok(battleRevision, "deferred loader must expose the shared Battle presentation revision");
assert.ok(
  loaderDelivery[1] >= battleRevision[1],
  `deferred loader delivery pin ${loaderDelivery[1]} must not predate Battle presentation revision ${battleRevision[1]}`,
);
assert.ok(!html.includes("deferred-ui-loader.js?v=20260901-1231"), "stale pre-Battle-convergence loader pin must not return");

console.log(`battle presentation loader delivery smoke: ok (${loaderDelivery[1]} >= ${battleRevision[1]})`);
