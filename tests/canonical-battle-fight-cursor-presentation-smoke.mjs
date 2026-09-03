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
  /fightCursor: "\.\/assets\/canonical-battle-ui\/cursor_fight\.png"/,
  "Battle UI adapter must resolve the published canonical fight cursor asset",
);
assert.match(
  adapter,
  /data-dppt-menu="fight"\] \.move-grid button:active::before \{[\s\S]*?background-image: var\(--canonical-battle-fight-cursor\)/,
  "fight move active state must render the canonical fight cursor",
);
assert.match(
  adapter,
  /setProperty\("--canonical-battle-fight-cursor", `url\("\$\{CANONICAL_BATTLE_UI_ASSETS\.fightCursor\}"\)`\)/,
  "shared adapter must publish the canonical fight cursor CSS variable",
);
assert.match(
  preview,
  /canonical-battle-ui-assets\.js\?v=20260904-0700/,
  "preview must request the fresh Battle UI adapter generation",
);
assert.match(
  index,
  /preview\.js\?v=20260904-0700/,
  "public Safari entrypoint must request the fresh preview generation",
);

console.log("canonical Battle fight cursor presentation smoke passed");
