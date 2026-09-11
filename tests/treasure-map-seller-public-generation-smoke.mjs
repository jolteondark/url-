import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const command = await readFile(new URL("../runtime/safari-pokemon-center-command.js", import.meta.url), "utf8");
const seller = await readFile(new URL("../runtime/safari-treasure-map-interaction.js", import.meta.url), "utf8");

assert.match(index, /\.\/runtime\/safari-pokemon-center-command\.js\?v=20260911-1902/);
assert.doesNotMatch(index, /\.\/runtime\/safari-pokemon-center-command\.js\?v=20260911-1500/);
assert.doesNotMatch(index, /\.\/runtime\/safari-pokemon-center-command\.js\?v=20260911-1030/);
assert.doesNotMatch(index, /\.\/runtime\/safari-pokemon-center-command\.js\?v=20260911-0905/);
assert.doesNotMatch(index, /\.\/runtime\/safari-pokemon-center-command\.js\?v=20260908-1030/);
assert.match(index, /\.\/runtime\/safari-treasure-map-interaction\.js\?v=20260911-1200/);
assert.doesNotMatch(index, /\.\/runtime\/safari-treasure-map-interaction\.js\?v=20260911-0905/);
assert.match(index, /\.\/runtime\/mapless-treasure-map-board-placement-v108\.js\?v=20260911-1030/);
assert.match(index, /\.\/runtime\/safari-treasure-map-result-interaction\.js\?v=20260911-1030/);
assert.match(command, /import \{ interactiveSafariTreasureMapSeller \} from "\.\/safari-treasure-map-interaction\.js";/);
assert.match(command, /import \{ materializeTreasureMapForDayV108 \} from "\.\/mapless-treasure-map-board-placement-v108\.js";/);
assert.match(command, /import \{ activateSafariTreasureMapResult \} from "\.\/safari-treasure-map-result-interaction\.js";/);
assert.match(command, /event\.normal_event_id === "treasure_map_seller"/);
assert.match(command, /return interactiveSafariTreasureMapSeller\(runtime, index\)/);
assert.match(command, /event\.normal_event_id === "treasure_map_result"/);
assert.match(command, /return activateSafariTreasureMapResult\(runtime, index\)/);
assert.match(command, /materializeTreasureMapForDayV108\(runtime\)/);
assert.match(seller, /id:"accuse"/);
assert.match(seller, /resolveSafariTreasureMapSellerAccusation/);
assert.match(seller, /registerSafariNormalEventBattleContinuation\("treasure_map_seller"/);
assert.doesNotMatch(command, /mapless_treasure_map\s*=/);
assert.doesNotMatch(command, /spend_money|set_treasure_map/);

console.log("treasure map public generation smoke: ok");
