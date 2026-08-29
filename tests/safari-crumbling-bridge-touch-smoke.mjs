import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const runtime = await readFile(new URL("../runtime/safari-crumbling-bridge-interaction.js", import.meta.url), "utf8");
const presentation = await readFile(new URL("../crumbling-bridge-touch-presentation.js", import.meta.url), "utf8");
const manifest = JSON.parse(await readFile(new URL("../board-presentation-manifest.json", import.meta.url), "utf8"));

assert.match(runtime, /resolveCrumblingBridge/);
assert.match(runtime, /hasSafariUsablePartyType\(runtime, "FLYING"\)/);
assert.match(runtime, /hasSafariUsablePartyType\(runtime, "PSYCHIC"\)/);
assert.match(runtime, /resolveMaplessNormalEventMediumReward/);
assert.match(runtime, /resolveMaplessV108TreasureChestReward/);
assert.match(runtime, /resolveRewardTransaction/);
assert.match(runtime, /damageSafariPokemonFlat/);
assert.match(runtime, /damageSafariPokemonPercent/);
assert.match(runtime, /finishMaplessRun/);
assert.match(runtime, /op:"request_save", reason:"crumbling_bridge"/);
assert.doesNotMatch(runtime, /start_wild_battle|start_trainer_battle/);

assert.match(presentation, /openSafariCrumblingBridgeTouch/);
assert.match(presentation, /resolveSafariCrumblingBridgeInteraction/);
assert.match(presentation, /eventId:"crumbling_bridge"/);
assert.match(presentation, /button\[data-board-index\]/);
assert.match(presentation, /button\[data-normal-event-action\]/);
assert.match(presentation, /saveSafariPlayableRun/);
assert.match(presentation, /capture:true/);

assert.equal(manifest.modules.some((url) => url.startsWith("./crumbling-bridge-touch-presentation.js?v=")), true);

console.log("safari-crumbling-bridge-touch-smoke: PASS");
