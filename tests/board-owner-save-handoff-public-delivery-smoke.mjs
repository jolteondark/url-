import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../preview-app.js", import.meta.url), "utf8");
const previewSource = readFileSync(new URL("../preview.js", import.meta.url), "utf8");
const indexSource = readFileSync(new URL("../index.html", import.meta.url), "utf8");

assert.match(
  appSource,
  /const result = await activateSafariDayBoardCell\(runtime, index\);[\s\S]*?autoSaveIfRequested\(result, "Day Board auto-save"\);/,
  "Board owner result must hand persistence requests to the existing shared save writer",
);
assert.match(
  previewSource,
  /import\("\.\/preview-app\.js\?v=20260906-1830"\)/,
  "preview.js must publish the Board save handoff preview-app generation",
);
assert.match(
  indexSource,
  /src="\.\/preview\.js\?v=20260906-1830"/,
  "index.html must publish the matching outer preview generation",
);

console.log("board owner save handoff public delivery smoke: ok");
