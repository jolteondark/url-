import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolveMaplessPokemonCenterHealing } from "../runtime/mapless-pokemon-center-healing.js";

const owner = resolveMaplessPokemonCenterHealing({ player:{ party:[] } });
assert.equal(owner.healed, true, "valid party should resolve Pokemon Center healing");
assert.ok(owner.operations.some((operation) => operation?.op === "request_save" && operation?.reason === "pokemon_center_healed"), "Pokemon Center owner should emit the save request");

const unavailable = resolveMaplessPokemonCenterHealing({ player:null });
assert.equal(unavailable.healed, false);
assert.equal(unavailable.operations.some((operation) => operation?.op === "request_save"), false, "failed Center resolution must not request persistence");

const source = await readFile(new URL("../runtime/safari-pokemon-center-command.js", import.meta.url), "utf8");
assert.match(source, /persistenceRequested:owner\.operations\.some\(\(operation\) => operation\?\.op === "request_save"\)/, "Safari Center should project persistence only from owner operations");
assert.doesNotMatch(source, /centerOwner:owner, persistenceRequested:true/, "Safari Center must not keep a fixed second save truth");

console.log("pokemon center owner-persistence smoke: ok");
