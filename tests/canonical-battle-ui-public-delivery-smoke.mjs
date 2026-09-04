import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const preview = fs.readFileSync(path.join(root, "preview.js"), "utf8");
const adapterPath = path.join(root, "runtime", "canonical-battle-ui-assets.js");
const adapter = fs.readFileSync(adapterPath, "utf8");

assert.match(
  index,
  /<script type="module" src="\.\/preview\.js\?v=20260904-1000"><\/script>/,
  "public preview entry must use the current canonical Battle UI delivery generation",
);
assert.match(
  preview,
  /import \{ installCanonicalBattleUiAssets \} from "\.\/runtime\/canonical-battle-ui-assets\.js\?v=20260904-1000";/,
  "published preview must import the current versioned shared canonical Battle UI adapter",
);
assert.match(
  preview,
  /installCanonicalBattleUiAssets\(\)/,
  "published preview boot must install canonical Battle UI assets",
);

const expectedAssets = [
  "databox_normal.png",
  "databox_normal_foe.png",
  "overlay_message.png",
  "overlay_fight.png",
  "overlay_hp.png",
  "overlay_lv.png",
  "cursor_command.png",
  "cursor_fight.png",
];
for (const filename of expectedAssets) {
  const relative = `./assets/canonical-battle-ui/${filename}`;
  assert.ok(adapter.includes(relative), `shared adapter must reference exact-case canonical asset: ${relative}`);
  const bytes = fs.readFileSync(path.join(root, "assets", "canonical-battle-ui", filename));
  assert.deepEqual(
    [...bytes.subarray(0, 8)],
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    `canonical Battle UI asset must be a PNG: ${filename}`,
  );
}

console.log("Canonical Battle UI public-delivery smoke passed");
