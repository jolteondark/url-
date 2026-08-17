import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../runtime/safari-playable-integration-ai.js", import.meta.url), "utf8");

assert.doesNotMatch(source, /function applyResolvedHp\(/, "Safari facade must not replay HP already owned by the battle runtime");
assert.doesNotMatch(source, /function lastHpAfter\(/, "stale operation-based HP projection must stay removed");
assert.doesNotMatch(source, /function foeWasReplaced\(/, "replacement-specific HP patching must stay removed");
assert.match(source, /function prepareBoundaryTrainerMove\(runtime\)/, "only the boundary bypass needs facade-side trainer choice");
assert.match(source, /battle\.origin !== "boundary_trial"/, "normal trainer battles must not run the facade AI a second time");
assert.match(source, /result\?\.opponentChoice/, "normal trainer compatibility metadata must reuse the already-resolved opponent choice");
assert.match(source, /choice\.command === "struggle" \? "STRUGGLE"/, "Struggle compatibility label must survive the single-choice path");

console.log("safari AI simplification guard smoke: ok");
