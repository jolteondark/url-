import assert from "node:assert/strict";
import { RubyMT19937Random } from "../runtime/ruby-mt19937-random.js";
import { hasMaplessV108ItemMetadata } from "../runtime/mapless-v108-item-metadata.js";
import {
  MAPLESS_V108_METEOR_STONE_ITEMS,
  MAPLESS_V108_METEOR_ITEMS,
  MAPLESS_V108_METEOR_STEEL_ITEMS,
  MAPLESS_V108_METEOR_CARRY_ITEMS,
  MAPLESS_V108_METEOR_STAR_ITEMS,
  hydrateMaplessV108MeteorFragmentFixedData,
  resolveMaplessV108MeteorFragmentReward,
} from "../runtime/mapless-v108-meteor-fragment.js";

function existing(ids) { return ids.filter((id) => hasMaplessV108ItemMetadata(id)); }
function drawUnique(pool, count, rng) {
  const source = [...pool], out = [];
  for (let i = 0; i < count && source.length > 0; i += 1) out.push(source.splice(rng.randInt(source.length), 1)[0]);
  return out;
}

assert.deepEqual(MAPLESS_V108_METEOR_STONE_ITEMS, [
  "FIRESTONE", "THUNDERSTONE", "WATERSTONE", "LEAFSTONE", "MOONSTONE",
  "SUNSTONE", "SHINYSTONE", "DUSKSTONE", "DAWNSTONE", "ICESTONE",
]);
assert.deepEqual(MAPLESS_V108_METEOR_ITEMS, [
  "STARDUST", "STARPIECE", "COMETSHARD", "IRONBALL", "METALCOAT", "HARDSTONE", "FLOATSTONE",
]);

const seed = 921108;
const expectedRng = new RubyMT19937Random(seed);
const expectedRoll = expectedRng.randInt(100);
const expectedChoices = drawUnique(existing([...MAPLESS_V108_METEOR_STONE_ITEMS, ...MAPLESS_V108_METEOR_ITEMS]), 3, expectedRng);
const hydrated = hydrateMaplessV108MeteorFragmentFixedData(seed);
assert.equal(hydrated.smash_roll, expectedRoll);
assert.deepEqual(hydrated.rock_choices, expectedChoices);
assert.deepEqual(hydrateMaplessV108MeteorFragmentFixedData(seed), hydrated, "fixed-data replay must be deterministic");

const preserved = hydrateMaplessV108MeteorFragmentFixedData(seed, { smash_roll:0, rock_choices:["HARDSTONE"] });
assert.equal(preserved.smash_roll, 0, "Ruby ||= semantics must preserve zero");
assert.deepEqual(preserved.rock_choices, ["HARDSTONE"], "hydrated ROCK choices must not be redrawn");
assert.deepEqual(resolveMaplessV108MeteorFragmentReward(seed, "rock", { rockChoices:preserved.rock_choices, rockChoice:"HARDSTONE" }).items, ["HARDSTONE"]);
assert.equal(resolveMaplessV108MeteorFragmentReward(seed, "rock", { rockChoices:preserved.rock_choices, rockChoice:"NUGGET" }).kind, "invalid_rock_choice");

const steelRng = new RubyMT19937Random(seed);
const steelPool = existing(MAPLESS_V108_METEOR_STEEL_ITEMS);
const steelCount = 2 + steelRng.randInt(2);
const expectedSteel = Array.from({ length:steelCount }, () => steelPool[steelRng.randInt(steelPool.length)]);
assert.deepEqual(resolveMaplessV108MeteorFragmentReward(seed, "steel").items, expectedSteel);

const carryRng = new RubyMT19937Random(seed);
const carryPool = existing(MAPLESS_V108_METEOR_CARRY_ITEMS);
assert.deepEqual(resolveMaplessV108MeteorFragmentReward(seed, "carry").items, [carryPool[carryRng.randInt(carryPool.length)]]);

const stoneRng = new RubyMT19937Random(seed);
const stonePool = existing(MAPLESS_V108_METEOR_STONE_ITEMS);
assert.deepEqual(resolveMaplessV108MeteorFragmentReward(seed, "smash", { smashRoll:54 }).items, [stonePool[stoneRng.randInt(stonePool.length)]]);
const starRng = new RubyMT19937Random(seed);
const starPool = existing(MAPLESS_V108_METEOR_STAR_ITEMS);
assert.deepEqual(resolveMaplessV108MeteorFragmentReward(seed, "smash", { smashRoll:55 }).items, [starPool[starRng.randInt(starPool.length)]]);
assert.deepEqual(resolveMaplessV108MeteorFragmentReward(seed, "smash", { smashRoll:89 }), { kind:"shared_large", tier:"large", count:1, items:[] });
assert.deepEqual(resolveMaplessV108MeteorFragmentReward(seed, "smash", { smashRoll:90 }), { kind:"none", items:[] });

console.log("mapless v0.9.108 meteor fragment smoke: ok");
