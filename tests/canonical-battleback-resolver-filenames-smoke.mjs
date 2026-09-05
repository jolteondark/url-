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
    background: "./assets/canonical-battlebacks/field_eve_bg.png",
    playerBase: "./assets/canonical-battlebacks/field_eve_base0.png",
    foeBase: "./assets/canonical-battlebacks/field_eve_base1.png",
  },
  night: {
    background: "./assets/canonical-battlebacks/field_night_bg.png",
    playerBase: "./assets/canonical-battlebacks/field_night_base0.png",
    foeBase: "./assets/canonical-battlebacks/field_night_base1.png",
  },
};

assert.deepEqual(CANONICAL_BATTLEBACK_VARIANTS, expected);
assert.deepEqual(resolveCanonicalBattlebackAssets("evening"), expected.eve);
assert.deepEqual(resolveCanonicalBattlebackAssets(2), expected.night);
assert.equal(resolveCanonicalBattlebackAssets("unknown"), null);

const serialized = JSON.stringify(CANONICAL_BATTLEBACK_VARIANTS);
assert.match(serialized, /field_eve_bg\.png/);
assert.match(serialized, /field_night_base0\.png/);
assert.doesNotMatch(serialized, /field_(?:bg|base[01])_(?:eve|night)\.png/);

console.log("canonical battleback resolver filenames smoke: ok");
