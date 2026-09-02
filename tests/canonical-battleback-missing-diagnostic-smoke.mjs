import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../canonical-battleback-presentation-bridge.js", import.meta.url), "utf8");

assert.match(source, /canonicalBattlebackMissing/);
assert.match(source, /__maplessBattlebackPresentationDiagnostic/);
assert.match(source, /mapless-canonical-battleback-missing/);
assert.match(source, /console\.warn\(`\[Mapless\] canonical battleback assets unpublished/);
assert.match(source, /if \(signature === lastMissingSignature\) return;/);
assert.doesNotMatch(source, /backgroundImage\s*=\s*["'`]linear-gradient/);

console.log("canonical battleback missing diagnostic smoke: ok");
