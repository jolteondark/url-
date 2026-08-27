import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../runtime/safari-lost-pokemon-interaction.js", import.meta.url), "utf8");

assert.match(source, /resolveMaplessV108LostPokemonBerryThanks/,
  "Safari Lost Pokemon must delegate berry thanks selection to the canonical v0.9.108 owner");
assert.match(source, /resolveMaplessV108LostPokemonGiftRoll/,
  "Safari Lost Pokemon must use the canonical gift roll when hydration has not populated gift_roll yet");
assert.match(source, /thanks\.kind === "rare_item"/,
  "canonical rare-item thanks must be dispatched as the rare branch");
assert.match(source, /rare_reward_items:rareThanks \? selectedReward\.items : undefined/,
  "the canonical rare berry must be passed back through the Lost Pokemon resolver");
assert.doesNotMatch(source, /rare_thanks:false/,
  "Safari must not permanently disable the canonical rare-thanks branch");

const berryBlock = source.slice(source.indexOf('if (action === "berry")'), source.indexOf('const owner = resolveLostPokemon({ event, action:"leave"')); 
assert.match(berryBlock, /if \(thanks\.kind === "shared_small"\)[\s\S]*borrowSafariSharedRunRandomInt/,
  "shared run RNG should only be borrowed for the shared-small fallback");
assert.match(berryBlock, /if \(sharedCounter !== null\) state\.preview_encounter_counter = sharedCounter/,
  "failed shared-small commits must restore the shared RNG counter");

console.log("safari lost pokemon rare thanks smoke: ok");
