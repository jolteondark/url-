import fs from "node:fs";
import assert from "node:assert/strict";

const source = fs.readFileSync(new URL("../runtime/safari-miner-interaction.js", import.meta.url), "utf8");

assert.match(source, /MAPLESS_MINER_COLLAPSE_PERCENT_V108 = 15/);
assert.match(source, /borrowSafariSharedRunRandomInt/);
assert.match(source, /ensureSafariEncounterSeed/);
assert.doesNotMatch(source, /crypto\.getRandomValues|Math\.random/);
assert.match(source, /const collapseRoll = Number\(workRandomInt\(100\)\)/);
assert.match(source, /if \(collapseRoll < MAPLESS_MINER_COLLAPSE_PERCENT_V108\)[\s\S]*?return \{[\s\S]*?result:"collapse"/);
assert.match(source, /result:"collapse"[\s\S]*?outcome:null/);
assert.match(source, /const outcomeRoll = Number\(workRandomInt\(100\)\)/);

console.log("Safari Miner shared RNG collapse smoke passed");
