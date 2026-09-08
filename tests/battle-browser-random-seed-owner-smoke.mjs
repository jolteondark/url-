import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const shared = await readFile(new URL("../runtime/battle-browser-random-seed.js", import.meta.url), "utf8");
const round = await readFile(new URL("../runtime/browser-battle-round-runtime.js", import.meta.url), "utf8");
const priority = await readFile(new URL("../runtime/battle-core-priority.js", import.meta.url), "utf8");

assert.match(shared, /getRandomValues/);
assert.match(shared, /Math\.random\(\)/);
assert.match(shared, /0x7fffffff/);
assert.match(round, /import \{ browserBattleRandomSeed \} from "\.\/battle-browser-random-seed\.js";/);
assert.doesNotMatch(round, /function browserCombatSeed\(/, "round runtime must not retain a second browser seed owner");
assert.match(round, /combatRandomSeed = browserBattleRandomSeed\(\), priorityRandomSeed = browserBattleRandomSeed\(\)/, "round default draws must remain exactly two and left-to-right: combat then priority");
assert.match(priority, /buildCanonicalPriorityRandomOrder/);
assert.match(priority, /createRubyRandomPicker/);

console.log("battle browser random seed owner smoke: ok");
