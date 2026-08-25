import assert from "node:assert/strict";
import { RubyMT19937Random } from "../runtime/ruby-mt19937-random.js";
import { prepareCanonicalClassicNormalDataV108 } from "../runtime/mapless-normal-event-v108-preparation.js";
import { canonicalBerryEntriesFromBagSlots, MAPLESS_V108_RARE_BERRY_IDS } from "../runtime/mapless-v108-berry-catalog.js";

const types = ["NORMAL", "DARK", "GRASS"];

{
  const seed = 12345;
  const rng = new RubyMT19937Random(seed);
  const expectedRoll = rng.randInt(100);
  const expectedType = types[rng.randInt(3)];
  const data = prepareCanonicalClassicNormalDataV108("berry_thief", {}, { normalSeed:seed, day:1, bagSlots:[] });
  assert.equal(data.thief_roll, expectedRoll);
  assert.deepEqual(data.stolen, []);
  assert.equal(data.type, expectedType, "empty Bag must not consume theft RNG");
}

{
  const seed = 24680;
  const bagSlots = [["SITRUSBERRY",2],["POTION",9],["RAZZBERRY",1],["ORANBERRY",3]];
  assert.deepEqual(canonicalBerryEntriesFromBagSlots(bagSlots), [["RAZZBERRY",1],["ORANBERRY",3],["SITRUSBERRY",2]]);
  const rng = new RubyMT19937Random(seed);
  const expectedRoll = rng.randInt(100);
  const entries = canonicalBerryEntriesFromBagSlots(bagSlots);
  const count = 1 + rng.randInt(3);
  const expectedStolen = [];
  for (let i=0;i<count;i+=1) {
    const choices = entries.filter(([id,qty]) => qty > expectedStolen.filter((x)=>x===id).length);
    if (!choices.length) break;
    expectedStolen.push(choices[rng.randInt(choices.length)][0]);
  }
  const expectedType = types[rng.randInt(3)];
  const data = prepareCanonicalClassicNormalDataV108("berry_thief", {}, { normalSeed:seed, day:1, bagSlots });
  assert.equal(data.thief_roll, expectedRoll);
  assert.deepEqual(data.stolen, expectedStolen);
  assert.equal(data.type, expectedType);
  for (const id of new Set(data.stolen)) {
    const qty = bagSlots.find(([slotId]) => slotId===id)?.[1] ?? 0;
    assert.ok(data.stolen.filter((x)=>x===id).length <= qty);
  }
}

{
  const fixed = { thief_roll:7, stolen:["ORANBERRY"], type:"DARK" };
  const data = prepareCanonicalClassicNormalDataV108("berry_thief", fixed, { normalSeed:999, day:1, bagSlots:[["SITRUSBERRY",9]] });
  assert.deepEqual(data, fixed, "Save/Continue fixed data must not be rerolled");
}

assert.deepEqual(MAPLESS_V108_RARE_BERRY_IDS, ["LIECHIBERRY","GANLONBERRY","SALACBERRY","PETAYABERRY","APICOTBERRY","LANSATBERRY","STARFBERRY","ENIGMABERRY"]);
console.log("berry-thief-v108-hydration-smoke: ok");
