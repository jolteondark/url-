import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const indexSource = await readFile(new URL("../index.html", import.meta.url), "utf8");
const loaderSource = await readFile(new URL("../deferred-ui-loader.js", import.meta.url), "utf8");

assert.match(
  indexSource,
  /deferred-ui-loader\.js\?v=20260909-0115/,
  "top-level Safari/Web entry must publish the current deferred UI loader generation",
);
assert.doesNotMatch(
  indexSource,
  /deferred-ui-loader\.js\?v=20260908-2300/,
  "retired deferred UI loader generation must not remain in the public entrypoint after loader changes",
);
assert.match(
  loaderSource,
  /BATTLE_PRESENTATION_PUBLIC_REVISION = "20260909-0015"/,
  "published loader must retain the current canonical Battle presentation generation",
);
assert.match(
  loaderSource,
  /normal-event-choice-augmenter\.js\?v=20260908-2130/,
  "published loader fallback must retain the active shared normal-event augmenter",
);

console.log("deferred-ui-loader-public-generation-smoke: ok");
