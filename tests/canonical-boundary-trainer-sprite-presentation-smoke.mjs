import assert from "node:assert/strict";
import fs from "node:fs";

const bridge = fs.readFileSync(new URL("../trainer-battle-canonical-sprite.js", import.meta.url), "utf8");
const uiBridge = fs.readFileSync(new URL("../canonical-battle-ui-bridge.js", import.meta.url), "utf8");
const resolver = fs.readFileSync(new URL("../runtime/canonical-trainer-sources.js", import.meta.url), "utf8");
const boundaryParty = fs.readFileSync(new URL("../runtime/mapless-boundary-trial-party3-v108.js", import.meta.url), "utf8");

assert.match(bridge, /canonicalTrainerPublishedPath/);
assert.match(bridge, /battle\?\.trainer\?\.trainer_type/);
assert.match(bridge, /canonicalTrainerPublishedPath\(`\$\{trainerType\}\.png`\)/);
assert.match(bridge, /new URL\(publishedPath, import\.meta\.url\)\.href/);
assert.doesNotMatch(bridge, /BROCK\s*[:=]|MISTY\s*[:=]|GREEN\s*[:=]/);
assert.match(uiBridge, /trainer-battle-canonical-sprite\.js/);

for (const [trainerType, publishedName] of [
  ["LEADER_Brock", "LEADER_Brock.png"],
  ["LEADER_Misty", "LEADER_Misty.png"],
  ["LEADER_Surge", "LEADER_Surge.png"],
  ["LEADER_Erika", "LEADER_Erika.png"],
  ["LEADER_Koga", "LEADER_Koga.png"],
  ["LEADER_Sabrina", "LEADER_Sabrina.png"],
  ["LEADER_Blaine", "LEADER_Blaine.png"],
  ["RIVAL2", "RIVAL2.png"],
]) {
  assert.ok(boundaryParty.includes(`party("${trainerType}"`), `missing canonical boundary trainer type ${trainerType}`);
  assert.ok(resolver.includes(`'${publishedName}'`), `missing published canonical trainer asset ${publishedName}`);
}

console.log("canonical boundary trainer sprite presentation smoke: PASS");
