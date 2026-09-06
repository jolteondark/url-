import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../runtime/safari-normal-battle-round-base.js", import.meta.url), "utf8");

const inputSeams = source.match(/battleWeatherState: battle\.battle_weather_state \?\? null/g) ?? [];
const outputSeams = source.match(/battle\.battle_weather_state = structuredClone\(resolved\.battleWeatherState \?\? null\);/g) ?? [];

assert.equal(inputSeams.length, 2, "wild and trainer normal rounds must both receive the persisted raw weather state");
assert.equal(outputSeams.length, 2, "wild and trainer normal rounds must both persist only the resolved authoritative weather state");
assert.ok(source.includes("resolveBrowserTrainerBattleRound({\n    roundInput:"), "trainer path must continue through the shared browser trainer round owner");
assert.ok(source.includes("const resolved = resolveBrowserBattleRound({"), "wild path must continue through the shared browser round owner");

console.log("safari normal battle weather handoff smoke: ok");
