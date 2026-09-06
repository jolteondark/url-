import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../runtime/safari-playable-integration-boundary.js", import.meta.url), "utf8");

const inputSeams = source.match(/battleWeatherState: battle\.battle_weather_state \?\? null/g) ?? [];
const outputSeams = source.match(/battle\.battle_weather_state = clone\(resolved\.battleWeatherState \?\? null\);/g) ?? [];

assert.equal(inputSeams.length, 1, "boundary round must receive the persisted raw weather state exactly once");
assert.equal(outputSeams.length, 1, "boundary round must persist only the resolved authoritative weather state exactly once");
assert.ok(source.includes("resolved = resolveBrowserBattleRound({"), "boundary path must continue through the shared browser round owner");
assert.ok(source.indexOf("const roundOperations =") < source.indexOf("battle.battle_weather_state = clone(resolved.battleWeatherState ?? null);"), "authoritative weather persistence must occur only after the shared round resolves");

console.log("safari boundary battle weather handoff smoke: ok");
