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
  /hpOverlay: "\.\/assets\/canonical-battle-ui\/overlay_hp\.png"/,
  "Battle UI adapter must resolve the published canonical HP overlay asset",
);
assert.match(
  adapter,
  /data-canonical-battle-ui="ready"\] \.hp-track/,
  "HP tracks must only switch to the canonical overlay after shared asset preload succeeds",
);
assert.match(
  adapter,
  /--canonical-battle-hp-overlay/,
  "Battle UI adapter must expose the canonical HP overlay through the shared presentation variable",
);
assert.match(
  adapter,
  /data-canonical-battle-ui="error"\] \.hp-track/,
  "HP tracks must fail closed when a required canonical Battle UI asset is unavailable",
);
assert.match(
  preview,
  /canonical-battle-ui-assets\.js\?v=20260904-0500/,
  "preview must request the fresh canonical Battle UI adapter generation",
);

console.log("canonical Battle HP overlay presentation smoke passed");
