import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";

const frontSpecies = [
  "CATERPIE",
  "CHARMANDER",
  "DRUDDIGON",
  "DWEBBLE",
  "GASTLY",
  "HERACROSS",
  "KANGASKHAN",
  "LAPRAS",
  "MAWILE",
  "PICHU",
  "PIDGEY",
  "PLUSLE",
  "RALTS",
  "SABLEYE",
  "SEVIPER",
  "SHUCKLE",
  "STUNFISK",
  "TROPIUS",
];
const backSpecies = ["CATERPIE", "CHARMANDER", "DWEBBLE", "PICHU"];
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function assertPublishedPng(relativePath) {
  const url = new URL(`../${relativePath}`, import.meta.url);
  assert.ok(statSync(url).size > pngSignature.length, `${relativePath} must be a non-empty published PNG`);
  const bytes = readFileSync(url);
  assert.deepEqual(bytes.subarray(0, pngSignature.length), pngSignature, `${relativePath} must preserve PNG bytes`);
}

for (const species of frontSpecies) {
  assertPublishedPng(`assets/canonical-battle-sprites/front/${species}.png`);
}
for (const species of backSpecies) {
  assertPublishedPng(`assets/canonical-battle-sprites/back/${species}.png`);
}

const adapter = readFileSync(new URL("../runtime/canonical-battle-battler-assets.js", import.meta.url), "utf8");
for (const species of frontSpecies) {
  assert.match(adapter, new RegExp(`\\"${species}\\"`), `${species} public PNG must remain reachable through the shared resolver`);
}
for (const species of backSpecies) {
  assert.match(adapter, new RegExp(`CANONICAL_BATTLE_BACK_SPECIES[\\s\\S]*\\"${species}\\"`), `${species} back PNG must remain reachable through the shared resolver`);
}

const preview = readFileSync(new URL("../preview.js", import.meta.url), "utf8");
const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
assert.match(preview, /canonical-battle-battler-assets\.js\?v=20260904-1800/, "reachable preview must request the post-back-sprite battler adapter generation");
assert.doesNotMatch(preview, /canonical-battle-battler-assets\.js\?v=20260904-0800/, "reachable preview must not retain the stale pre-back-sprite battler adapter generation");
assert.match(index, /preview\.js\?v=20260905-0100/, "public entry point must deliver the post-back-sprite preview generation");
assert.doesNotMatch(index, /preview\.js\?v=20260904-1000/, "public entry point must not retain the stale preview shell generation");

console.log(`canonical Battle battler public delivery smoke: ${frontSpecies.length} front + ${backSpecies.length} back PNGs ok`);
