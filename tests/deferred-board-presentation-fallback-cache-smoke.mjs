import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = path.resolve(import.meta.dirname, "..");
const indexText = fs.readFileSync(path.join(root, "index.html"), "utf8");
const loaderText = fs.readFileSync(path.join(root, "deferred-ui-loader.js"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "board-presentation-manifest.json"), "utf8"));

assert.match(indexText, /src="\.\/deferred-ui-loader\.js\?v=20260903-0400"/, "Safari must request the current deferred loader generation");
assert.ok(!indexText.includes("deferred-ui-loader.js?v=20260902-2300"), "Safari must not retain the pre-event-fallback loader generation");
assert.ok(loaderText.includes('fetch("./board-presentation-manifest.json", { cache: "no-store" })'), "Board manifest fetch must remain no-store");

for (const file of ["fake-nurse-check-id-presentation.js", "burning-wagon-fire-presentation.js"]) {
  const manifestEntry = manifest.modules.find((entry) => entry.includes(file));
  assert.ok(manifestEntry, `${file} must remain in the Board presentation manifest`);
  assert.ok(loaderText.includes(`"./${manifestEntry.slice(2)}"`), `${file} fallback must match the manifest revision`);
}

console.log("deferred Board presentation fallback cache smoke: ok");
