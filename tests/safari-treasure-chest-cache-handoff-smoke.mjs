import assert from "node:assert/strict";
import fs from "node:fs";

const index = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

assert.match(
  index,
  /"\.\/runtime\/safari-treasure-chest-interaction\.js":\s*"\.\/runtime\/safari-treasure-chest-interaction\.js\?v=20260827-2342"/,
  "Safari must fetch the post-#949 Treasure Chest interaction owner",
);
assert.match(
  index,
  /"\.\/runtime\/safari-web-startup\.js":\s*"\.\/runtime\/safari-web-startup\.js\?v=20260827-2342"/,
  "Safari must fetch the post-#949 production startup hydration owner",
);
assert.match(
  index,
  /"\.\/runtime\/safari-web-playable-integration\.js":\s*"\.\/runtime\/safari-web-playable-integration\.js\?v=20260827-2342"/,
  "Safari must refresh the integration root so the startup cache pin is re-resolved",
);

console.log("Safari Treasure Chest cache handoff smoke: ok");
