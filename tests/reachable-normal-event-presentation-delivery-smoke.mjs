import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = path.resolve(import.meta.dirname, "..");
const manifestText = fs.readFileSync(path.join(root, "board-presentation-manifest.json"), "utf8");
const loaderText = fs.readFileSync(path.join(root, "deferred-ui-loader.js"), "utf8");
const manifest = JSON.parse(manifestText);

const required = [
  "fake-nurse-check-id-presentation.js",
  "burning-wagon-fire-presentation.js",
];

for (const file of required) {
  assert.ok(fs.existsSync(path.join(root, file)), `${file} must exist`);
  const manifestEntry = manifest.modules.find((entry) => entry.includes(file));
  assert.ok(manifestEntry, `${file} must be delivered by board presentation manifest`);
  assert.match(manifestEntry, /\?v=\d{8}-\d{4}$/, `${file} manifest delivery must be versioned`);
  assert.ok(loaderText.includes(`"./${manifestEntry.slice(2)}"`), `${file} must also be present in fallback delivery with the same revision`);
  assert.ok(!manifest.modules.includes(`./${file}`), `${file} must not regress to unversioned manifest delivery`);
}

const revisions = required.map((file) => {
  const entry = manifest.modules.find((candidate) => candidate.includes(file));
  return entry.split("?v=")[1];
});
assert.equal(new Set(revisions).size, 1, "reachable event presentation sidecars should share one delivery revision");

console.log("reachable normal-event presentation delivery smoke: ok");
