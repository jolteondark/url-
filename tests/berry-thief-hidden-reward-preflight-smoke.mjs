import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../runtime/safari-berry-thief-interaction.js", import.meta.url), "utf8");

const reservationIndex = source.indexOf("hiddenReward = reserveHiddenSmallReward(runtime)");
const combinedPreflightIndex = source.indexOf("const chaseRewards = [...possibleRewards, ...(hiddenReward ? [hiddenReward.item] : [])]");
const battleStartIndex = source.indexOf("const started = await activateSafariNormalEventWildBattle");

assert.ok(reservationIndex >= 0, "chase must reserve the canonical hidden reward before Battle start");
assert.ok(combinedPreflightIndex > reservationIndex, "chase must preflight stolen items together with the reserved hidden reward");
assert.ok(battleStartIndex > combinedPreflightIndex, "combined reward capacity must be checked before Battle starts");
assert.match(source, /if \(hiddenRewardRng\) restoreSharedRunRng\(state, hiddenRewardRng\);/, "rejected preflight must roll back the shared-run RNG reservation");
assert.doesNotMatch(source, /const preflight = possibleRewards\.length \? transaction\(runtime, possibleRewards\) : null;\s*if \(preflight && !preflight\.success\)/, "chase must not validate only restored stolen items");

console.log("Berry Thief hidden reward preflight smoke: PASS");
