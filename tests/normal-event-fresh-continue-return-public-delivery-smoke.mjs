import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const command = await readFile(new URL("../runtime/safari-pokemon-center-command.js", import.meta.url), "utf8");

assert.match(index, /"\.\/runtime\/safari-pokemon-center-command\.js": "\.\/runtime\/safari-pokemon-center-command\.js\?v=20260912-1700"/);
assert.doesNotMatch(index, /safari-pokemon-center-command\.js\?v=20260912-1600/);
assert.match(index, /"\.\/runtime\/safari-honey-tree-interaction\.js": "\.\/runtime\/safari-honey-tree-interaction\.js\?v=20260909-1900"/);
assert.match(index, /"\.\/runtime\/safari-pokemon-nest-interaction\.js": "\.\/runtime\/safari-pokemon-nest-interaction\.js\?v=20260909-2300"/);
assert.match(index, /"\.\/runtime\/safari-sleeping-giant-interaction\.js": "\.\/runtime\/safari-sleeping-giant-interaction\.js\?v=20260909-2200"/);
assert.match(command, /import "\.\/safari-honey-tree-interaction\.js";/);
assert.match(command, /import "\.\/safari-pokemon-nest-interaction\.js";/);
assert.match(command, /import "\.\/safari-sleeping-giant-interaction\.js";/);
assert.doesNotMatch(command, /safari-(?:honey-tree|pokemon-nest|sleeping-giant)-interaction\.js\?v=/);

console.log("normal event fresh Continue RETURN public delivery smoke: ok");
