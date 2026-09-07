import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../runtime/safari-playable-integration-entry-weather.js", import.meta.url), "utf8");
const integration = await readFile(new URL("../runtime/safari-playable-integration.js", import.meta.url), "utf8");

assert.ok(integration.includes('import * as playable from "./safari-playable-integration-entry-weather.js";'), "production Safari integration must route boundary Battle through the entry-weather adapter");
assert.ok(integration.includes('export * from "./safari-playable-integration-entry-weather.js";'), "boundary replacement entry-weather adapter must remain public through the Safari integration");
assert.ok(source.includes('if (!result?.foeReplacementApplied || battle?.origin !== "boundary_trial" || !battle?.foe) return result;'), "boundary foe weather must fire only after authoritative replacement commit");
assert.ok(source.includes('if (!result?.playerReplacementApplied || result?.result !== "continued_with_replacement") return result;'), "boundary player weather must not fire for rejected or uncommitted replacement");
assert.ok(source.includes('base.resolveSafariBattleRound(runtime, selectedMoveId)'), "boundary foe weather must remain downstream of the existing Battle round/replacement owner");
assert.ok(source.includes('base.resolveSafariBoundaryPlayerReplacement(runtime, replacementPartyIndex, options)'), "boundary player weather must remain downstream of the existing replacement owner");
assert.ok(source.includes('commitSwitchInEntryWeatherCanonical({ battle, pokemon: battle.foe })'), "boundary foe replacement must use the shared entry-weather adapter");
assert.ok(source.includes('commitSwitchInEntryWeatherCanonical({ battle, pokemon: active })'), "boundary player replacement must use the shared entry-weather adapter");
assert.equal(source.match(/hook: "switch_in"/g)?.length ?? 0, 0, "boundary adapter must not duplicate switch-in ability logic");

console.log("safari boundary entry weather replacement smoke: ok");
