import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");

assert.match(
  index,
  /"\.\/runtime\/safari-web-playable-integration\.js": "\.\/runtime\/safari-web-playable-integration\.js\?v=20260905-2230"/,
);
assert.match(
  index,
  /"\.\/runtime\/safari-normal-battle-finalize\.js": "\.\/runtime\/safari-normal-battle-finalize\.js\?v=20260905-2230"/,
);

console.log("normal Battle finalize public delivery smoke: ok");
