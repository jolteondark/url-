import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const cssLink = html.match(/<link rel="stylesheet" href="\.\/battle-dppt-command-menu\.css\?v=(\d{8}-\d{4})" \/>/);

assert.ok(cssLink, "battle-dppt-command-menu.css must be loaded with an explicit public revision");
assert.notEqual(cssLink[1], "20260819-2120", "canonical Battle command chrome must not regress to the pre-consumer Safari cache revision");
assert.ok(cssLink[1] >= "20260902-0457", "Battle command stylesheet delivery revision must include canonical command/fight chrome consumers");

console.log("canonical battle command stylesheet delivery smoke: ok");
