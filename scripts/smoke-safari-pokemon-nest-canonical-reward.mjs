import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../runtime/safari-pokemon-nest-interaction.js", import.meta.url), "utf8");
const indexSource = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

assert.match(source, /resolveMaplessV108PokemonNestSearchReward/,
  "Safari Pokémon Nest must call the canonical v0.9.108 search reward owner");
assert.doesNotMatch(source, /0x4e455354|const LOW_ITEMS|const ITEM_META|RubyMT19937Random/,
  "Safari Pokémon Nest must not keep the legacy local reward pool/XOR RNG");
assert.match(source, /searchRoll < 65 \? canonicalSearchReward\(event\)/,
  "only the direct search-reward branch should resolve a canonical item");
assert.match(source, /result:"search_reward_empty"/,
  "empty canonical pool must fail closed without inventing a fallback");
assert.match(source, /result:"reward_bag_full"[\s\S]*completed:false[\s\S]*persistenceRequested:false/,
  "Bag-full search reward must remain retryable and unconsumed");
assert.doesNotMatch(source, /battle_success:success,[\s\S]{0,80}search_reward_item/,
  "post-Battle search continuation must not fabricate an unused reward item");
assert.match(source, /registerSafariNormalEventBattleContinuation\("pokemon_nest"/,
  "existing Pokémon Nest Battle continuation must remain registered");
assert.match(source, /grantNormalEventHiddenEgg/,
  "hidden egg grant owner must remain delegated");
assert.match(source, /request_save", reason:"normal_event_post_battle"/,
  "post-Battle Save\/Continue handoff must remain exactly-once owned by the continuation");
assert.match(indexSource, /safari-pokemon-nest-interaction\.js\?v=20260827-1205/,
  "Safari entry must fetch the post-#930 Pokémon Nest owner generation");

console.log("safari pokemon-nest canonical reward smoke: ok");
