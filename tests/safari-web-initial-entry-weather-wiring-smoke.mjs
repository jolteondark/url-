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

const boundaryExportChain = [
  ["../runtime/safari-playable-integration-entry-weather.js", /export \* from "\.\/safari-playable-integration-boundary\.js";/],
  ["../runtime/safari-playable-integration-boundary.js", /export \* from "\.\/safari-playable-integration-wounded\.js";/],
  ["../runtime/safari-playable-integration-wounded.js", /export \* from "\.\/safari-playable-integration-pre-wounded\.js";/],
  ["../runtime/safari-playable-integration-pre-wounded.js", /export \* from "\.\/safari-playable-integration-legacy\.js";/],
  ["../runtime/safari-playable-integration-legacy.js", /export \* from "\.\/safari-playable-integration-core\.js";/],
];
for (const [path, exportPattern] of boundaryExportChain) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  assert.match(source, exportPattern, `${path}: boundary/full integration must keep sharing the core Battle-start owner`);
  assert.doesNotMatch(source, /commitInitialEntryWeatherCanonical\(\{/, `${path}: boundary wrappers must not add a second initial-entry weather commit owner`);
}

console.log("safari web/full initial entry-weather wiring smoke: ok");
