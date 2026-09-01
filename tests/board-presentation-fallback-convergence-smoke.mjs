import fs from "node:fs";
import assert from "node:assert/strict";

const loader = fs.readFileSync(new URL("../deferred-ui-loader.js", import.meta.url), "utf8");
const manifest = JSON.parse(fs.readFileSync(new URL("../board-presentation-manifest.json", import.meta.url), "utf8"));

const match = loader.match(/const boardPresentationFallbackModules = \[(.*?)\];/s);
assert.ok(match, "deferred loader must declare boardPresentationFallbackModules");

const fallbackModules = [...match[1].matchAll(/"([^"]+)"/g)].map((entry) => entry[1]);
assert.deepEqual(
  fallbackModules,
  manifest.modules,
  "Board presentation fallback must exactly mirror the no-store manifest so fetch failure preserves the same playable handoffs",
);

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
