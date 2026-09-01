import fs from "node:fs";
import assert from "node:assert/strict";

const loader = fs.readFileSync(new URL("../deferred-ui-loader.js", import.meta.url), "utf8");
const manifest = JSON.parse(fs.readFileSync(new URL("../board-presentation-manifest.json", import.meta.url), "utf8"));

const match = loader.match(/const boardPresentationFallbackModules = \[(.*?)\];/s);
assert.ok(match, "deferred loader must declare boardPresentationFallbackModules");

const fallbackModules = [...match[1].matchAll(/"([^"]+)"/g)].map((entry) => entry[1]);
const modulePath = (entry) => entry.split("?")[0];
assert.deepEqual(
  fallbackModules.map(modulePath),
  manifest.modules.map(modulePath),
  "Board presentation fallback must preserve the same playable handoff modules as the no-store manifest",
);

const revisions = new Set(
  manifest.modules.map((entry) => new URL(entry, "https://mapless.invalid/").searchParams.get("v")),
);
assert.equal(revisions.size, 1, "Board presentation manifest must use one shared public delivery revision");
assert.ok(!revisions.has(null), "every Board presentation manifest module must carry the shared delivery revision");

for (const required of [
  "day-board-direct-persistence-handoff.js",
  "board-special-event-ui-handoff.js",
  "crumbling-bridge-touch-presentation.js",
]) {
  assert.ok(
    fallbackModules.some((entry) => entry.includes(required)),
    `fallback must retain ${required}`,
  );
}

console.log("board presentation fallback convergence smoke: ok");
