import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const loader = fs.readFileSync(new URL("../deferred-ui-loader.js", import.meta.url), "utf8");

const outerRevision = html.match(/deferred-ui-loader\.js\?v=([0-9-]+)/)?.[1];
assert.ok(outerRevision, "deferred UI loader must have an explicit outer Safari revision");
assert.equal(outerRevision, "20260902-1431", "outer loader revision must move after #1126/#1127 loader changes");
assert.ok(loader.includes("20260902-1400"), "outer delivery must expose the current reachable shop presentation generation");
assert.ok(loader.includes("20260902-0312"), "outer delivery must expose the current board presentation fallback generation");

console.log(`deferred UI outer delivery smoke: ok ${outerRevision}`);
