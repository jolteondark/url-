import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const adapter = fs.readFileSync(path.join(root, "runtime", "canonical-battle-ui-assets.js"), "utf8");
const preview = fs.readFileSync(path.join(root, "preview.js"), "utf8");

assert.match(
  adapter,
  /commandCursor: "\.\/assets\/canonical-battle-ui\/cursor_command\.png"/,
  "Battle UI adapter must resolve the published canonical command cursor asset",
);
assert.match(
  adapter,
  /--canonical-battle-command-cursor/,
  "Battle UI adapter must expose the canonical command cursor through the shared presentation variable",
);
assert.match(
  adapter,
  /\.dppt-command-root button:focus-visible::before/,
  "root Battle command focus must render the canonical cursor",
);
assert.match(
  adapter,
  /data-dppt-menu="fight"\] \.move-grid button:focus-visible::before/,
  "fight move focus must render the canonical cursor",
);
assert.match(
  preview,
  /canonical-battle-ui-assets\.js\?v=20260904-0300/,
  "preview must request the fresh canonical Battle UI adapter generation",
);

console.log("canonical Battle command cursor presentation smoke passed");
