import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

assert.match(
  html,
  /"\.\/runtime\/safari-pokemon-center-command\.js": "\.\/runtime\/safari-pokemon-center-command\.js\?v=20260903-1358"/,
  "Safari Board dispatcher must publish the bounty-poster generation"
);
assert.match(
  html,
  /"\.\/runtime\/safari-bounty-poster-interaction\.js": "\.\/runtime\/safari-bounty-poster-interaction\.js\?v=20260903-1358"/,
  "bounty poster interaction must be independently cache-busted"
);

console.log("bounty poster public delivery smoke: ok");
