import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const command = await readFile(new URL("../runtime/safari-pokemon-center-command.js", import.meta.url), "utf8");

assert.match(index, /\.\/runtime\/safari-pokemon-center-command\.js\?v=20260911-0905/);
assert.doesNotMatch(index, /\.\/runtime\/safari-pokemon-center-command\.js\?v=20260908-1030/);
assert.match(index, /\.\/runtime\/safari-treasure-map-interaction\.js\?v=20260911-0905/);
assert.match(command, /import \{ interactiveSafariTreasureMapSeller \} from "\.\/safari-treasure-map-interaction\.js";/);
assert.match(command, /event\.normal_event_id === "treasure_map_seller"/);
assert.match(command, /return interactiveSafariTreasureMapSeller\(runtime, index\)/);
assert.doesNotMatch(command, /mapless_treasure_map\s*=/);
assert.doesNotMatch(command, /spend_money|set_treasure_map/);

console.log("treasure map seller public generation smoke: ok");
