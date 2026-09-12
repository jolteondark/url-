import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const touch = readFileSync(new URL("../normal-event-touch-presentation.js", import.meta.url), "utf8");
const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");

assert.match(
  touch,
  /old_statue:\s*"\.\/runtime\/safari-old-statue-break-rewards\.js"/,
  "Old Statue touch UI should import the completed owner through the shared plain specifier",
);
assert.doesNotMatch(
  touch,
  /safari-old-statue-break-rewards\.js\?v=/,
  "Old Statue touch UI must not bypass the shared Safari import-map generation with a private dated URL",
);
assert.match(
  index,
  /"\.\/runtime\/safari-old-statue-break-rewards\.js":\s*"\.\/runtime\/safari-old-statue-break-rewards\.js\?v=20260912-1208"/,
  "served Safari should expose the completed Old Statue owner through the shared import map",
);

console.log("old statue touch shared delivery smoke: ok");
