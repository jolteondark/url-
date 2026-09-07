import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [legacy, command, sharedUi, manifest, loader, index] = await Promise.all([
  read("berry-juice-shop-touch-presentation.js"),
  read("runtime/safari-pokemon-center-command.js"),
  read("normal-event-touch-presentation.js"),
  read("board-presentation-manifest.json"),
  read("deferred-ui-loader.js"),
  read("index.html"),
]);

assert.doesNotMatch(legacy, /addEventListener\s*\(\s*["']click["']/);
assert.doesNotMatch(legacy, /saveSafariPlayableRun/);
assert.doesNotMatch(legacy, /resolveSafariBerryJuiceShopInteraction/);
assert.match(command, /openSafariBerryJuiceShopTouch/);
assert.match(command, /normal_event_id === "berry_juice_shop"/);
assert.match(sharedUi, /berry_juice_shop:"\.\/runtime\/safari-berry-juice-shop-interaction\.js"/);
assert.match(sharedUi, /resolveSafariBerryJuiceShopInteraction\(current, active\.boardIndex, actionId\)/);
assert.match(sharedUi, /persistSafariOwnerResult\(current, result, window\.localStorage\)/);
assert.match(manifest, /berry-juice-shop-touch-presentation\.js\?v=20260908-0330/);
assert.match(loader, /berry-juice-shop-touch-presentation\.js\?v=20260908-0330/);
assert.match(index, /safari-pokemon-center-command\.js\?v=20260908-0330/);
assert.match(index, /normal-event-touch-presentation\.js\?v=20260908-0330/);
assert.match(index, /safari-berry-juice-shop-touch\.js\?v=20260908-0330/);

console.log("berry juice single-owner smoke: ok");
