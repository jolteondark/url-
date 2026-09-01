import fs from "node:fs";
import assert from "node:assert/strict";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const match = html.match(/<script type="importmap">\s*({[\s\S]*?})\s*<\/script>/);
assert.ok(match, "index.html must expose the Safari runtime importmap");

const importmap = JSON.parse(match[1]);
const entries = Object.entries(importmap.imports ?? {}).filter(([specifier]) => specifier.startsWith("./runtime/"));
assert.ok(entries.length >= 20, "playable Safari runtime importmap should cover the current canonical owner set");

const revisions = new Set(entries.map(([, url]) => new URL(url, "https://mapless.invalid/").searchParams.get("v")));
assert.equal(revisions.size, 1, "all playable Safari runtime imports must use one shared public delivery revision");
assert.ok(!revisions.has(null), "every playable Safari runtime import must carry the shared delivery revision");

for (const required of [
  "./runtime/safari-web-playable-integration.js",
  "./runtime/safari-web-startup.js",
  "./runtime/safari-normal-event-touch-handoff.js",
  "./runtime/safari-lost-bag-interaction.js",
  "./runtime/safari-fake-nurse-interaction.js",
  "./runtime/safari-wounded-pokemon-integration.js",
]) {
  assert.ok(importmap.imports[required], `public importmap must retain ${required}`);
}

console.log("safari runtime importmap public delivery smoke: ok");
