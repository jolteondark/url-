import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const source = fs.readFileSync(path.join(root, "runtime/battle-core-combat-turn.js"), "utf8");

assert.match(source, /injectLiveBattleWeatherIntoActionCanonical\(stageInjected, weatherState, activeWeatherBattlers\)/);
assert.match(source, /weatherState = commitResolvedMoveWeatherCanonical\(weatherState, resolved\.action\)/);
assert.match(source, /weatherState = advanceBattleWeatherEnvironmentEndOfRoundCanonical\(weatherState\)/);
assert.match(source, /let weatherState = createBattleWeatherEnvironmentState\(seeded\.weatherState\)/);
assert.match(source, /weatherState: round\?\.weatherState \?\? weatherState/);
assert.match(source, /return \{ \.\.\.seeded, rounds, weatherState \}/);

console.log("battle weather ordered core static smoke: ok");
