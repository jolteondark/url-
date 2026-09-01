import fs from "node:fs";
import assert from "node:assert/strict";

const presentation = fs.readFileSync(new URL("../normal-event-touch-presentation.js", import.meta.url), "utf8");
const handoff = fs.readFileSync(new URL("../day-board-direct-persistence-handoff.js", import.meta.url), "utf8");
const adapter = fs.readFileSync(new URL("../runtime/safari-owner-result-persistence.js", import.meta.url), "utf8");

assert.match(
  presentation,
  /import \{ persistSafariOwnerResult \} from "\.\/runtime\/safari-owner-result-persistence\.js";/,
  "generic normal-event presentation must use the shared owner-result persistence adapter",
);
assert.match(
  presentation,
  /persistSafariOwnerResult\(current, result, window\.localStorage\);/,
  "generic normal-event result must delegate persistence exactly once through the shared adapter",
);
assert.ok(
  !presentation.includes("saveSafariPlayableRun"),
  "presentation must not call the Persistence writer directly",
);
assert.ok(
  !presentation.includes("result.persistenceRequested") && !presentation.includes('operation.op === "request_save"'),
  "presentation must not own request_save detection",
);
assert.match(
  handoff,
  /from "\.\/runtime\/safari-owner-result-persistence\.js";/,
  "Day Board direct persistence handoff must share the same adapter",
);
assert.ok(
  !handoff.includes('from "./runtime/safari-web-startup.js"'),
  "Day Board handoff must not duplicate the writer import after adapter extraction",
);
assert.match(
  adapter,
  /import \{ saveSafariPlayableRun \} from "\.\/safari-web-startup\.js";/,
  "shared adapter must retain the existing single Persistence writer",
);
assert.match(adapter, /function ownerResultRequestsPersistence\(result\)/);
assert.match(adapter, /function persistSafariOwnerResult\(runtime, result, storage = globalThis\.localStorage\)/);

console.log("normal-event shared persistence handoff smoke: ok");
