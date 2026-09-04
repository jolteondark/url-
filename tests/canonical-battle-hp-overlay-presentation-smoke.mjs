import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const adapter = fs.readFileSync(path.join(root, "runtime", "canonical-battle-ui-assets.js"), "utf8");
const preview = fs.readFileSync(path.join(root, "preview.js"), "utf8");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");

assert.match(
  adapter,
  /hpOverlay: "\.\/assets\/canonical-battle-ui\/overlay_hp\.png"/,
  "Battle UI adapter must resolve the published canonical HP overlay asset",
);
assert.match(
  adapter,
  /data-canonical-battle-ui="ready"\] \.hp-track span[\s\S]*background-image: var\(--canonical-battle-hp-overlay\)[\s\S]*background-size: 100% 300%/,
  "canonical HP spritesheet must be applied to the owner-sized HP fill, not stretched across the track",
);
assert.match(
  adapter,
  /data-hp-zone="yellow"[\s\S]*background-position: center 50%/,
  "yellow HP zone must select the middle canonical spritesheet row",
);
assert.match(
  adapter,
  /data-hp-zone="red"[\s\S]*background-position: center bottom/,
  "red HP zone must select the bottom canonical spritesheet row",
);
assert.doesNotMatch(
  adapter,
  /data-canonical-battle-ui="ready"\] \.hp-track \{[\s\S]{0,260}background-image: var\(--canonical-battle-hp-overlay\)/,
  "HP spritesheet must not be stretched over the entire track",
);
assert.match(
  adapter,
  /data-canonical-battle-ui="error"\] \.hp-track/,
  "HP presentation must fail closed when a required canonical Battle UI asset is unavailable",
);
assert.match(
  preview,
  /canonical-battle-ui-assets\.js\?v=20260904-1000/,
  "preview must request the fresh canonical Battle UI adapter generation",
);
assert.match(
  index,
  /preview\.js\?v=20260904-1000/,
  "public Safari entrypoint must request the fresh preview generation",
);

console.log("canonical Battle HP overlay presentation smoke passed");
