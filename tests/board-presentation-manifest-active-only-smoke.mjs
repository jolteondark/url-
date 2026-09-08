import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const manifest = JSON.parse(await readFile(new URL("../board-presentation-manifest.json", import.meta.url), "utf8"));
const loaderSource = await readFile(new URL("../deferred-ui-loader.js", import.meta.url), "utf8");
const augmenterSource = await readFile(new URL("../normal-event-choice-augmenter.js", import.meta.url), "utf8");

const active = [
  "./normal-event-choice-augmenter.js?v=20260908-2130",
];
assert.deepEqual(manifest.modules, active);

const fallbackMatch = loaderSource.match(/const boardPresentationFallbackModules = \[(.*?)\];/s);
assert.ok(fallbackMatch, "board presentation fallback array must remain explicit");
const fallbackEntries = [...fallbackMatch[1].matchAll(/["']([^"']+)["']/g)].map((match) => match[1]);
assert.deepEqual(fallbackEntries, active, "manifest failure fallback must match the active shared augmenter");

for (const legacy of ["fake-nurse-check-id-presentation.js", "burning-wagon-fire-presentation.js"]) {
  assert.equal(manifest.modules.some((entry) => entry.includes(legacy)), false, `${legacy} must not load from the production manifest`);
  assert.equal(fallbackEntries.some((entry) => entry.includes(legacy)), false, `${legacy} must not load from manifest-failure fallback`);
  const legacySource = await readFile(new URL(`../${legacy}`, import.meta.url), "utf8");
  assert.match(legacySource, /Compatibility presentation loader only\./);
  assert.match(legacySource, /normal-event-choice-augmenter\.js\?v=20260908-2130/);
  assert.doesNotMatch(legacySource, /addEventListener\s*\(/);
  assert.doesNotMatch(legacySource, /saveSafariPlayableRun|persistSafariOwnerResult|stopImmediatePropagation/);
}
assert.match(augmenterSource, /safariFakeNurseWarning/);
assert.match(augmenterSource, /safariBurningWagonFireChoices/);
assert.match(augmenterSource, /check_id:heal/);
assert.match(augmenterSource, /fire:none/);
assert.doesNotMatch(augmenterSource, /saveSafariPlayableRun|persistSafariOwnerResult/);
assert.doesNotMatch(augmenterSource, /stopImmediatePropagation/);

const retired = [
  "berry-juice-shop-touch-presentation.js",
  "trainer-camp-touch-presentation.js",
  "old-statue-touch-presentation.js",
  "machine-gacha-touch-presentation.js",
  "wishing-fountain-touch-presentation.js",
  "item-collector-touch-presentation.js",
  "crumbling-bridge-touch-presentation.js",
];
for (const name of retired) {
  assert.equal(manifest.modules.some((entry) => entry.includes(name)), false, `${name} must not load from the production manifest`);
  assert.equal(fallbackEntries.some((entry) => entry.includes(name)), false, `${name} must not load from manifest-failure fallback`);
}

for (const name of retired) {
  const source = await readFile(new URL(`../${name}`, import.meta.url), "utf8");
  assert.match(source, /Compatibility(?: presentation)? loader only\./);
  assert.doesNotMatch(source, /addEventListener\s*\(\s*["']click["']/);
  assert.doesNotMatch(source, /saveSafariPlayableRun|persistSafariOwnerResult/);
}

console.log("board presentation manifest active-only smoke: ok");
