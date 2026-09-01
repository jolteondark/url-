import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const cssLink = html.match(/<link rel="stylesheet" href="\.\/battle-dppt-ui\.css\?v=(\d{8}-\d{4})" \/>/);

assert.ok(cssLink, "battle-dppt-ui.css must be loaded with an explicit public revision");
assert.notEqual(cssLink[1], "20260820-0754", "canonical Battle UI stylesheet must not regress to the pre-consumer Safari cache revision");
assert.ok(cssLink[1] >= "20260902-0208", "canonical Battle UI stylesheet delivery revision must include the current canonical consumer change");

console.log("canonical battle UI stylesheet delivery smoke: ok");
