import fs from "node:fs";
import assert from "node:assert/strict";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const required = [
  "traveling-cook-power-presentation.js",
  "lost-bag-touch-presentation.js",
  "normal-event-touch-presentation.js",
  "fake-nurse-check-id-presentation.js",
  "burning-wagon-fire-presentation.js",
];

const revisions = new Set();
for (const filename of required) {
  const match = html.match(new RegExp(`src=["']\\./${filename.replaceAll(".", "\\.")}\\?v=([^"']+)["']`));
  assert.ok(match, `index.html must directly deliver ${filename}`);
  revisions.add(match[1]);
}

assert.equal(revisions.size, 1, "reachable normal-event presentation entrypoints must share one public delivery revision");
for (const stale of ["20260828-2140", "20260829-0745", "20260828-1605", "20260827-1315", "20260827-0815"]) {
  assert.ok(!html.includes(`?v=${stale}`), `stale normal-event presentation revision must not return: ${stale}`);
}

console.log("normal-event presentation public delivery smoke: ok");
