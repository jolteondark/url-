import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../canonical-battleback-presentation-bridge.js", import.meta.url), "utf8");

assert.match(source, /canonicalBattlebackMissing/);
assert.match(source, /__maplessBattlebackPresentationDiagnostic/);
assert.match(source, /mapless-canonical-battleback-missing/);
assert.match(source, /console\.warn\(`\[Mapless\] canonical battleback assets unpublished/);
assert.match(source, /if \(signature === lastMissingSignature\) return;/);
assert.match(source, /element\.style\.backgroundImage = "none";/, "unpublished arena/platform assets must suppress CSS fallback art");
assert.match(source, /card\.style\.backgroundImage = "none";/, "unpublished field background must suppress the scene-level CSS gradient");
assert.match(source, /suppressSceneFallback\(card, !bg\)/, "scene fallback suppression must track canonical bg publication");
assert.doesNotMatch(source, /backgroundImage\s*=\s*["'`]linear-gradient/);

console.log("canonical battleback missing diagnostic/fail-closed smoke: ok");
