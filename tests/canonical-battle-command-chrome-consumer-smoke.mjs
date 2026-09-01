import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync(new URL("../battle-dppt-command-menu.css", import.meta.url), "utf8");

for (const [selector, variable] of [
  ['#battle-card[data-dppt-menu="root"] .dppt-command-root', '--canonical-battle-command-overlay'],
  ['#battle-card[data-dppt-menu="fight"] .move-grid', '--canonical-battle-fight-overlay'],
]) {
  const start = css.lastIndexOf(selector);
  assert.notEqual(start, -1, `${selector} must have a canonical chrome consumer`);
  const block = css.slice(start, css.indexOf("}", start) + 1);
  assert.ok(block.includes(`var(${variable})`), `${selector} must consume ${variable}`);
  assert.ok(block.includes("background-repeat:no-repeat"), `${selector} must not tile canonical chrome`);
  assert.ok(block.includes("background-size:100% 100%"), `${selector} must size canonical chrome to its owner surface`);
}

console.log("canonical battle command chrome consumer smoke: ok");
