import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const previewApp = readFileSync(new URL("../preview-app.js", import.meta.url), "utf8");

assert.match(
  previewApp,
  /persistSafariOwnerResult\s*} from "\.\/runtime\/safari-owner-result-persistence\.js\?v=20260907-0930"/,
  "preview auto-save must use the shared owner-result persistence adapter",
);
assert.doesNotMatch(
  previewApp,
  /result\?\.persistenceRequested\s*\|\|\s*result\?\.operations\?\.some/,
  "preview must not duplicate owner request_save detection",
);
assert.match(
  previewApp,
  /persistSafariOwnerResult\(runtime, result, window\.localStorage\)/,
  "preview owner results must persist through the shared adapter",
);

console.log("preview shared owner persistence smoke: ok");
