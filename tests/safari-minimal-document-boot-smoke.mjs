import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const bridgeShell = fs.readFileSync(new URL("../bridge-shell.css", import.meta.url), "utf8");

const styles = [...html.matchAll(/<link\s+rel="stylesheet"\s+href="([^"]+)"\s*\/>/g)].map((match) => match[1]);
const modules = [...html.matchAll(/<script\s+type="module"\s+src="([^"]+)"\s*><\/script>/g)].map((match) => match[1]);

assert.deepEqual(styles, ["./style.css"], "document boot must have exactly one blocking stylesheet");
assert.deepEqual(modules, ["./preview.js", "./deferred-ui-loader.js"], "document boot must only evaluate lightweight boot modules");
assert.doesNotMatch(html, /bridge-shell\.css|game-presentation\.css|event-presentation\.css|game-presentation\.js/);
assert.doesNotMatch(bridgeShell, /@import/, "deferred bridge shell must not recursively pull battle CSS");

console.log("Safari minimal document boot: PASS");
