import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../runtime/safari-playable-integration-ai.js", import.meta.url), "utf8");

assert.match(source, /function foeWasReplaced\(result\)/, "AI facade must identify trainer replacement results");
assert.match(source, /result\?\.foeReplacementApplied === true/, "canonical foe replacement flag must suppress stale HP projection");
assert.match(source, /result\?\.replacementApplied === true/, "legacy replacement flag must suppress stale HP projection");
assert.match(source, /trainerReplacementContinuation\?\.result === "continued_with_replacement"/, "replacement continuation result must suppress stale HP projection");
assert.match(source, /if \(!foeWasReplaced\(result\) && foeHp !== null && battle\.foe\)/, "old foe HP must never be replayed onto the new active foe");

console.log("safari AI replacement HP guard smoke: ok");
