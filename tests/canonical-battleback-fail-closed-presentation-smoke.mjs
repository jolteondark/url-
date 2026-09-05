import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const preview = await readFile(new URL("../preview.js", import.meta.url), "utf8");
const css = await readFile(new URL("../battle-dppt-ui.css", import.meta.url), "utf8");

assert.match(preview, /rememberCanonicalBattlebackDiagnostic/);
assert.match(preview, /canonicalBattleback\s*=\s*"unavailable"/);
assert.match(preview, /missing_owner_time_of_day/);
assert.doesNotMatch(preview, /resolveCanonicalBattlebackAssets\([^)]*(?:"day"|'day'|0)[^)]*\)/);

assert.match(css, /data-canonical-battleback="unavailable"/);
assert.match(css, /\.battle-platform\s*\{\s*\n?\s*background:none!important;/);
assert.match(css, /\.arena,[\s\S]*?\.battle-platform\{[\s\S]*?background:none!important;/);

assert.match(index, /battle-dppt-ui\.css\?v=20260906-0030/);
assert.match(index, /preview\.js\?v=20260906-0030/);

console.log("canonical battleback fail-closed presentation smoke: ok");
