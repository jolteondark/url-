import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const preview = fs.readFileSync(path.join(root, "preview.js"), "utf8");
const stamp = "20260825-0815";

assert.match(
  html,
  new RegExp(`<script type="module" src="\\./preview\\.js\\?v=${stamp}"></script>`),
  "Safari entry module must be cache-busted with the current playable build stamp",
);
assert.match(
  preview,
  new RegExp(`import\\("\\./preview-app\\.js\\?v=${stamp}"\\)`),
  "preview.js must force a fresh preview-app module graph",
);
assert.match(
  html,
  new RegExp(`<script type="module" src="\\./normal-event-touch-presentation\\.js\\?v=${stamp}"></script>`),
  "normal-event touch presentation must be cache-busted with the playable build",
);

for (const modulePath of [
  "safari-web-playable-integration.js",
  "safari-playable-integration.js",
  "safari-pokemon-center-command.js",
  "safari-normal-event-touch-handoff.js",
  "safari-berry-thief-interaction.js",
]) {
  const escaped = modulePath.replaceAll(".", "\\.");
  assert.match(
    html,
    new RegExp(`"\\./runtime/${escaped}": "\\./runtime/${escaped}\\?v=${stamp}"`),
    `${modulePath} must resolve through the current Safari playable build stamp`,
  );
}

assert.match(
  html,
  new RegExp(`canonical browser integration / v0\\.9\\.108 · build ${stamp}`),
  "visible Safari runtime build marker must match the cache-bust stamp",
);

console.log("Safari playable module cache-bust smoke passed");
