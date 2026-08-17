import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolveSafariCanonicalHpZone } from "../runtime/safari-canonical-hp-zone.js";

assert.equal(resolveSafariCanonicalHpZone({ hp: 28, maxHp: 28 }), 0);
assert.equal(resolveSafariCanonicalHpZone({ hp: 15, maxHp: 28 }), 0);
assert.equal(resolveSafariCanonicalHpZone({ hp: 14, maxHp: 28 }), 1);
assert.equal(resolveSafariCanonicalHpZone({ hp: 8, maxHp: 28 }), 1);
assert.equal(resolveSafariCanonicalHpZone({ hp: 7, maxHp: 28 }), 2);
assert.equal(resolveSafariCanonicalHpZone({ hp: 0, maxHp: 28 }), 2);

const css = await readFile(new URL("../canonical-battle-status.css", import.meta.url), "utf8");
assert.match(css, /data-hp-zone="1"[^}]*background-position:0 -6px/);
assert.match(css, /data-hp-zone="2"[^}]*background-position:0 -12px/);
console.log("canonical battle HP zone smoke: ok");
