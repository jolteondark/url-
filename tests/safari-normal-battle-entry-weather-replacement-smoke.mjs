import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../runtime/safari-normal-battle-round.js", import.meta.url), "utf8");
const shared = await readFile(new URL("../runtime/battle-switch-in-entry-weather-commit.js", import.meta.url), "utf8");

assert.ok(source.includes('commitSwitchInEntryWeatherCanonical({ battle, pokemon: battle.foe })'), "normal trainer replacement must use the shared entry-weather commit adapter");
assert.ok(source.includes('commitSwitchInEntryWeatherCanonical({ battle, pokemon: active })'), "normal player replacement must use the shared entry-weather commit adapter");
assert.ok(shared.includes('hook: "switch_in"'), "shared adapter must dispatch the canonical switch-in ability/item hook");
assert.ok(shared.includes("commitBattleWeatherRequestCanonical("), "shared adapter must commit through the raw weather owner");
assert.ok(source.includes("if (!result?.foeReplacementApplied || battle?.kind !== \"trainer\" || !battle?.foe) return result;"), "trainer foe entry weather must fire only after an applied replacement");
assert.ok(source.includes('if (result?.result !== "replaced") return result;'), "player entry weather must not fire for rejected or uncommitted replacement");
assert.ok(source.includes("applyCommittedFoeEntryWeather(runtime, resolveSafariNormalBattleRoundBase(runtime, selectedMoveId))"), "trainer replacement entry weather must remain downstream of the authoritative normal round owner");
assert.ok(source.includes("resolveSafariNormalBattlePlayerReplacementBase(runtime, replacementPartyIndex)"), "player replacement entry weather must remain downstream of the authoritative replacement owner");

const switchInCalls = shared.match(/hook: "switch_in"/g) ?? [];
assert.equal(switchInCalls.length, 1, "shared adapter must own switch-in weather dispatch exactly once");
assert.equal(source.match(/hook: "switch_in"/g)?.length ?? 0, 0, "normal adapter must not duplicate switch-in ability logic");

console.log("safari normal battle entry weather replacement smoke: ok");
