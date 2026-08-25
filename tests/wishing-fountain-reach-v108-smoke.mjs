import assert from "node:assert/strict";
import {
  MAPLESS_WISHING_FOUNTAIN_REACH_BATTLE_TYPES,
  MAPLESS_WISHING_FOUNTAIN_REACH_STATUSES,
  resolveMaplessWishingFountainReachBattleTypeV108,
  resolveMaplessWishingFountainReachStatusV108,
} from "../runtime/mapless-wishing-fountain-reach-v108.js";

assert.deepEqual(MAPLESS_WISHING_FOUNTAIN_REACH_BATTLE_TYPES, ["WATER", "GHOST"],
  "v0.9.108 reach Battle type pool/order must stay exact");
assert.deepEqual(MAPLESS_WISHING_FOUNTAIN_REACH_STATUSES, ["POISON", "PARALYSIS", "BURN", "SLEEP"],
  "v0.9.108 random_status pool/order must stay exact");
assert.equal(resolveMaplessWishingFountainReachBattleTypeV108(1), "GHOST",
  "seed=1 first rand(2) canonical vector");
assert.equal(resolveMaplessWishingFountainReachStatusV108(1), "PARALYSIS",
  "seed=1 first rand(4) canonical vector");
assert.equal(resolveMaplessWishingFountainReachBattleTypeV108(1), resolveMaplessWishingFountainReachBattleTypeV108(1),
  "action-time RNG must restart from normal_seed for each exclusive reach branch");
assert.throws(() => resolveMaplessWishingFountainReachStatusV108(undefined), TypeError);

console.log("Wishing Fountain v0.9.108 reach RNG/status source smoke passed");
