import assert from "node:assert/strict";
import fs from "node:fs";

const index = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

assert.match(
  index,
  /"\.\/runtime\/safari-pokemon-healing\.js":\s*"\.\/runtime\/safari-pokemon-healing\.js\?v=20260827-2259"/,
  "Safari must fetch the post-#952 shared percent-heal owner instead of a stale unversioned module",
);

console.log("Safari percent-heal cache handoff smoke: ok");
