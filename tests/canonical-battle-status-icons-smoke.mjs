import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const iconPath = new URL("../assets/canonical-battle-ui/icon_statuses.png", import.meta.url);
const bytes = await readFile(iconPath);
assert.equal(createHash("sha256").update(bytes).digest("hex"), "f1220f895c686dc8601916769be7853960a44f0efdccbd4b1ec429906dd33fa0");

const css = await readFile(new URL("../canonical-battle-status.css", import.meta.url), "utf8");
assert.match(css, /data-status="SLEEP"[^}]*background-position:0 0/);
for (const offset of [16, 32, 48, 64, 112]) {
  assert.match(css, new RegExp(`background-position:0 -${offset}px`));
}
console.log("canonical battle status icons smoke: ok");
