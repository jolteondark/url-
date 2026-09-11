import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const command = await readFile(new URL("../runtime/safari-pokemon-center-command.js", import.meta.url), "utf8");
const owner = await readFile(new URL("../runtime/mapless-pokemon-center-healing.js", import.meta.url), "utf8");

assert.match(index, /\.\/runtime\/safari-pokemon-center-command\.js\?v=20260911-1902/);
assert.match(index, /\.\/runtime\/mapless-pokemon-center-healing\.js\?v=20260911-1902/);
assert.doesNotMatch(index, /\.\/runtime\/safari-pokemon-center-command\.js\?v=20260911-1500/);
assert.match(command, /resolveMaplessPokemonCenterHealing/);
assert.match(command, /persistenceRequested:owner\.operations\.some\(\(operation\) => operation\?\.op === "request_save"\)/);
assert.doesNotMatch(command, /centerOwner:owner, persistenceRequested:true/);
assert.match(owner, /\{ op: "request_save", reason: "pokemon_center_healed" \}/);

console.log("pokemon center public generation smoke: ok");
