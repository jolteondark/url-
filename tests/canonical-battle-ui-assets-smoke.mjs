import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const assets = new Map([
  ["assets/canonical-battle-ui/databox_normal_foe.png", "4268488b4fc000a0f568f3523ff1c36cc9bbabe562fc1bb2b60767dbb88badd6"],
  ["assets/canonical-battle-ui/databox_normal.png", "3033b2023c4272ce00ce24372f92d754e2864c05416719a12a18c360c2135685"],
  ["assets/canonical-battle-ui/overlay_message.png", "2e1cddb017dbc1a6222aeefd5d86ff9052c2d6789d4b83b8fa77a000ec9fcdbd"],
  ["assets/canonical-battle-ui/overlay_fight.png", "0a0df11455a9d122b6d892fe9551b73d40aa4dbd3cd8974c2924d5330d7b8276"],
]);

for (const [path, expected] of assets) {
  const bytes = await readFile(new URL(`../${path}`, import.meta.url));
  const actual = createHash("sha256").update(bytes).digest("hex");
  assert.equal(actual, expected, `${path} must remain byte-identical to canonical v0.9.108`);
}

console.log("canonical battle UI asset identity smoke: ok");
