import fs from "node:fs";
import assert from "node:assert/strict";

const source = fs.readFileSync(new URL("../runtime/safari-miner-interaction.js", import.meta.url), "utf8");

assert.match(source, /MAPLESS_MINER_COLLAPSE_PERCENT_V108 = 5/);
assert.match(source, /borrowSafariSharedRunRandomInt/);
assert.match(source, /ensureSafariEncounterSeed/);
assert.doesNotMatch(source, /crypto\.getRandomValues|Math\.random/);
assert.match(source, /const collapseRoll = Number\(workRandomInt\(100\)\)/);
assert.match(source, /if \(collapseRoll < MAPLESS_MINER_COLLAPSE_PERCENT_V108\)[\s\S]*?miner_collapse/);
assert.doesNotMatch(source, /if \(collapseRoll < MAPLESS_MINER_COLLAPSE_PERCENT_V108\)[\s\S]*?result:"collapse"/);
assert.match(source, /const outcomeRoll = Number\(workRandomInt\(100\)\)/);
assert.match(source, /return \{ runtime, result:reward \? "rewarded" : outcome[\s\S]*?collapse, outcome/);

console.log("Safari Miner shared RNG collapse continuation smoke passed");
