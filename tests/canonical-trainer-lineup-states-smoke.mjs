import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const assets = Object.freeze({
  "icon_ball.png": "59726aee1d57f1cddf08f73e3f131af9bfcc521c8854506e9c4bbec6c602e94e",
  "icon_ball_empty.png": "6ad685f0170fd1866d65cf0a9ac09df50b8682c14ddc772a897a352d36ef6560",
  "icon_ball_faint.png": "ac526ffd02d2d119f5001a3dbf56471629a2a1f83919863f8391ee79c3ee14eb",
  "icon_ball_status.png": "cd1c9ab5602cfa6d10119f80bd1ecd7050c6eed2f024017cc204fb85efa8bc11",
});
for (const [name, expected] of Object.entries(assets)) {
  const bytes = await readFile(new URL(`../assets/canonical-battle-ui/${name}`, import.meta.url));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), expected);
}

const js = await readFile(new URL("../trainer-battle-presentation.js", import.meta.url), "utf8");
const css = await readFile(new URL("../trainer-battle-presentation.css", import.meta.url), "utf8");
assert.match(js, /classList\.add\("empty"\)/);
assert.match(js, /classList\.add\("status"\)/);
assert.match(js, /Math\.max\(6, party\.length \|\| 1\)/);
for (const name of Object.keys(assets)) assert.match(css, new RegExp(name.replace(".", "\\.")));
assert.doesNotMatch(js, /observe\([^)]*attributes/);
console.log("canonical trainer lineup states smoke: ok");
