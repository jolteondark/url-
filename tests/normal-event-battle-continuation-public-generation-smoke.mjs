import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const continuation = await readFile(new URL("../runtime/safari-normal-event-battle-continuation.js", import.meta.url), "utf8");

assert.match(
  index,
  /"\.\/runtime\/safari-normal-event-battle-continuation\.js":\s*"\.\/runtime\/safari-normal-event-battle-continuation\.js\?v=20260909-0700"/,
  "public import map must cache-bust the shared normal-event Battle continuation owner",
);
assert.doesNotMatch(
  index,
  /"\.\/runtime\/safari-normal-event-battle-continuation\.js":\s*"\.\/runtime\/safari-normal-event-battle-continuation\.js"/,
  "public delivery must not regress to an unversioned continuation owner",
);
assert.match(continuation, /reason:\s*"normal_event_battle_started"/);
assert.match(continuation, /state\.last_operations\s*=\s*operations/);

console.log("normal-event Battle continuation public generation smoke: ok");
