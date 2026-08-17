import assert from "node:assert/strict";
import fs from "node:fs";

const presentation = fs.readFileSync(new URL("../game-presentation.js", import.meta.url), "utf8");
const deferred = fs.readFileSync(new URL("../deferred-ui-loader.js", import.meta.url), "utf8");

assert.doesNotMatch(presentation, /new MutationObserver\(/, "generic presentation must not poll DOM mutations");
assert.match(presentation, /document\.addEventListener\("click",schedulePresentation/, "generic presentation must refresh after committed click renders");
assert.match(presentation, /window\.addEventListener\("pageshow",schedulePresentation/, "generic presentation must refresh on page lifecycle restore");
assert.match(presentation, /window\.addEventListener\("safari-runtime-changed",schedulePresentation/, "generic presentation must refresh from explicit runtime changes");
assert.match(presentation, /requestAnimationFrame\(renderPresentation\)/, "generic presentation refreshes must stay rAF-batched");

assert.doesNotMatch(deferred, /new MutationObserver\(/, "scene-demand loader must not observe hidden/attribute mutations");
assert.match(deferred, /function scheduleSceneBundleSync\(\)/, "scene-demand loader must expose an explicit batched scene sync");
assert.match(deferred, /document\.addEventListener\("click"[\s\S]*scheduleSceneBundleSync\(\)/, "scene-demand bundles must be checked after bubbling click renders");
assert.match(deferred, /window\.addEventListener\("pageshow", scheduleSceneBundleSync/, "scene-demand bundles must refresh on lifecycle restore");
assert.match(deferred, /window\.addEventListener\("safari-runtime-changed", scheduleSceneBundleSync/, "scene-demand bundles must refresh from explicit runtime changes");
assert.match(deferred, /requestAnimationFrame\(\(\) => \{[\s\S]*syncSceneBundles\(\)/, "scene-demand checks must stay rAF-batched");

console.log("Safari presentation observer-free scheduling smoke: ok");
