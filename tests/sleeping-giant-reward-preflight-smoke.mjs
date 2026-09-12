import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../runtime/safari-sleeping-giant-interaction.js", import.meta.url), "utf8");

const interactionStart = source.indexOf("export async function resolveSafariSleepingGiantInteraction");
const rewardPreflightIndex = source.indexOf("const rewardAttempt = reward(runtime, item);", interactionStart);
const rejectionIndex = source.indexOf("if (!rewardAttempt.success) return rewardBagFullResult", interactionStart);
const previewIndex = source.indexOf("const preview = resolveSleepingGiant", interactionStart);
const battleStartIndex = source.indexOf("const started = await activateSafariNormalEventWildBattle", interactionStart);

assert.ok(rewardPreflightIndex >= 0, "Sleeping Giant must preflight the canonical displayed item");
assert.ok(rejectionIndex > rewardPreflightIndex, "Bag-full preflight must reject the interaction before owner completion");
assert.ok(previewIndex > rejectionIndex, "Bag capacity must be validated before resolving steal/fight flow");
assert.ok(battleStartIndex > previewIndex, "Bag capacity must be validated before Battle starts");
assert.match(source, /result:"reward_bag_full",\s*completed:false,[\s\S]*?persistenceRequested:false/, "Bag-full result must remain nonterminal and unsaved");
assert.match(source, /if \(rewardAttempt && !rewardAttempt\.success\) throw new Error\("sleeping_giant post-battle reward no longer fits in Bag"\);/, "Battle RETURN must fail closed if the reserved reward no longer fits");
assert.doesNotMatch(source, /バッグがいっぱいで\$\{item\}は持ち帰れませんでした/, "Sleeping Giant must not resolve while silently dropping its canonical reward");

console.log("Sleeping Giant reward preflight smoke: PASS");
