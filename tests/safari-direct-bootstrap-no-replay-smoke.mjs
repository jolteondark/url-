import assert from "node:assert/strict";
import fs from "node:fs";

const bootstrap = fs.readFileSync(new URL("../runtime-on-explicit-action.js", import.meta.url), "utf8");

assert.match(bootstrap, /^import "\.\/preview\.js";\nimport "\.\/deferred-ui-loader\.js";\n$/);
assert.doesNotMatch(bootstrap, /import\s*\(/);
assert.doesNotMatch(bootstrap, /addEventListener\(["']click["']/);
assert.doesNotMatch(bootstrap, /preventDefault|stopImmediatePropagation|\.click\(\)|requestAnimationFrame/);
assert.doesNotMatch(bootstrap, /START_SELECTOR|startRuntime|replaying|startPromise/);

console.log("Safari bootstrap is direct and has no first-click replay layer.");
