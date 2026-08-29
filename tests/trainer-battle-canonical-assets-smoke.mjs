import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const loader = await readFile(new URL("../deferred-ui-loader.js", import.meta.url), "utf8");
const css = await readFile(new URL("../trainer-battle-presentation.css", import.meta.url), "utf8");

assert.match(loader, /state\.battle\.kind === "trainer"/);
assert.match(loader, /trainer-battle-presentation\.css\?v=20260830-0500/);
assert.match(loader, /trainer-battle-presentation\.js\?v=20260830-0500/);

for (const asset of [
  "overlay_lineup.png",
  "icon_ball.png",
  "icon_ball_status.png",
  "icon_ball_faint.png",
  "icon_ball_empty.png",
]) {
  assert.match(css, new RegExp(`assets/canonical-battle-ui/${asset.replace(".", "\\.")}`));
}

console.log("trainer battle canonical assets smoke: ok");
