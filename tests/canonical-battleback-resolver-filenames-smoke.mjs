import assert from "node:assert/strict";
import {
  CANONICAL_BATTLEBACK_VARIANTS,
  resolveCanonicalBattlebackAssets,
} from "../runtime/canonical-battleback-assets.js";

const expected = {
  day: {
    background: "./assets/canonical-battlebacks/field_bg.png",
    playerBase: "./assets/canonical-battlebacks/field_base0.png",
    foeBase: "./assets/canonical-battlebacks/field_base1.png",
  },
  eve: {
    background: "./assets/canonical-battlebacks/field_bg_eve.png",
    playerBase: "./assets/canonical-battlebacks/field_base0_eve.png",
    foeBase: "./assets/canonical-battlebacks/field_base1_eve.png",
  },
  night: {
    background: "./assets/canonical-battlebacks/field_bg_night.png",
    playerBase: "./assets/canonical-battlebacks/field_base0_night.png",
    foeBase: "./assets/canonical-battlebacks/field_base1_night.png",
  },
};

assert.deepEqual(CANONICAL_BATTLEBACK_VARIANTS, expected);
assert.deepEqual(resolveCanonicalBattlebackAssets("evening"), expected.eve);
assert.deepEqual(resolveCanonicalBattlebackAssets(2), expected.night);
assert.equal(resolveCanonicalBattlebackAssets("unknown"), null);

const serialized = JSON.stringify(CANONICAL_BATTLEBACK_VARIANTS);
assert.doesNotMatch(serialized, /field_eve_(?:bg|base[01])\.png/);
assert.doesNotMatch(serialized, /field_night_(?:bg|base[01])\.png/);

console.log("canonical battleback resolver filenames smoke: ok");
