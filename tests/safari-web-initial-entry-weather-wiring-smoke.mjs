import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

for (const path of [
  "../runtime/safari-web-combat-start.js",
  "../runtime/safari-playable-integration-core.js",
]) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  assert.match(source, /import \{ commitInitialEntryWeatherCanonical \} from "\.\/battle-initial-entry-weather-commit\.js";/);
  const setBattleStart = source.indexOf("function setBattle(");
  const commitIndex = source.indexOf("commitInitialEntryWeatherCanonical({", setBattleStart);
  const assignIndex = source.indexOf("state.battle = nextBattle;", setBattleStart);
  assert.ok(setBattleStart >= 0, `${path}: reachable Safari Battle start owner must exist`);
  assert.ok(commitIndex > setBattleStart, `${path}: reachable Safari Battle start must invoke the shared initial-entry owner`);
  assert.ok(assignIndex > commitIndex, `${path}: initial-entry weather must commit before authoritative state.battle assignment`);
  assert.match(source.slice(commitIndex, assignIndex), /battlerIndex: 0, pokemon: player/);
  assert.match(source.slice(commitIndex, assignIndex), /battlerIndex: 1, pokemon: opponent/);
  assert.equal((source.match(/commitInitialEntryWeatherCanonical\(\{/g) ?? []).length, 1, `${path}: Battle start must have exactly one initial-entry commit callsite`);
}

console.log("safari web/full initial entry-weather wiring smoke: ok");
