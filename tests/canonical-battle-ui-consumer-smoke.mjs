import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync(new URL("../battle-dppt-ui.css", import.meta.url), "utf8");

for (const [selector, variable] of [
  ["#battle-card .foe-info", "--canonical-battle-databox-foe"],
  ["#battle-card .player-info", "--canonical-battle-databox-player"],
  ["#battle-card .battle-message", "--canonical-battle-message-overlay"],
  ["#battle-card .hp-row>span", "--canonical-battle-hp-overlay"],
]) {
  const start = css.lastIndexOf(selector);
  assert.notEqual(start, -1, `${selector} must have a canonical asset consumer`);
  const block = css.slice(start, css.indexOf("}", start) + 1);
  assert.ok(block.includes(`var(${variable})`), `${selector} must consume ${variable}`);
}

console.log("canonical battle UI consumer smoke: ok");
