import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const bridgeSource = await readFile(new URL("../canonical-battleback-presentation-bridge.js", import.meta.url), "utf8");
const loaderSource = await readFile(new URL("../deferred-ui-loader.js", import.meta.url), "utf8");

assert.match(bridgeSource, /return null;\s*\n}\s*\n\nfunction battlePeriod/, "unknown/missing period must not normalize to DAY");
assert.match(bridgeSource, /if \(!period\) \{[\s\S]*reportMissingPeriod\(card\);[\s\S]*return;/, "battleback application must fail closed before resolving canonical assets");
assert.match(bridgeSource, /reason: "missing-owner-period"/, "unresolved owner period must remain diagnosable");
assert.match(bridgeSource, /suppressSceneFallback\(card, false\)/, "unresolved period must preserve the existing scene fallback");
assert.match(bridgeSource, /if \(text\.includes\("day"\)[\s\S]*return "day";/, "explicit DAY owner values must still resolve");
assert.match(bridgeSource, /if \(text\.includes\("night"\)\) return "night";/, "explicit NIGHT owner values must still resolve");
assert.match(bridgeSource, /return "eve";/, "explicit EVE owner values must still resolve");
assert.doesNotMatch(bridgeSource, /return "day";\s*\n}/, "normalizePeriod must not have an unconditional DAY fallback");
assert.match(loaderSource, /const BATTLE_PRESENTATION_PUBLIC_REVISION = "20260908-1900";/, "Safari/Web must request the fail-closed battle presentation generation");

console.log("canonical battleback owner-period fail-closed smoke: ok");
