import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../canonical-battleback-presentation-bridge.js", import.meta.url), "utf8");

assert.match(source, /new Image\(\)/, "canonical battleback delivery must verify actual image load");
assert.match(source, /image\.onload\s*=\s*\(\)\s*=>\s*resolve\(true\)/);
assert.match(source, /image\.onerror\s*=\s*\(\)\s*=>\s*resolve\(false\)/);
assert.match(source, /reason:\s*"load-error"/);
assert.match(source, /mapless-canonical-battleback-load-error/);
assert.match(source, /dataset\.canonicalBattlebackBg\s*=\s*checks\[0\]\s*\?\s*"published"\s*:\s*"load-error"/);
assert.match(source, /generation !== applyGeneration/, "late image loads must not repaint a newer battle scene");
assert.doesNotMatch(source, /\?\?\s*["']day["']|return\s+["']day["']\s*;/, "owner period must remain fail-closed");

console.log("canonical battleback load-error diagnostic smoke: ok");
