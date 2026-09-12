import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../runtime/safari-treasure-map-result-interaction.js", import.meta.url), "utf8");

const finishStart = source.indexOf("function finishAfterBattle");
const chestCommit = source.indexOf("const chest = resolveChestIntent(runtime, index, chestIntent(owner));", finishStart);
const refreshedProjection = source.indexOf("projected = bonusReward(runtime, map.seed);", chestCommit + 1);
const refreshedOwner = source.indexOf("owner = resolveCanonicalNormalEvent(\"treasure_map_result\"", refreshedProjection);
const bonusCommit = source.indexOf("...commitBonus(runtime, projected)", refreshedOwner);

assert.ok(finishStart >= 0, "treasure map Battle continuation owner must exist");
assert.ok(chestCommit > finishStart, "fake Treasure Map win must resolve the shared chest owner");
assert.ok(refreshedProjection > chestCommit, "bonus Bag projection must be refreshed after the chest owner commits");
assert.ok(refreshedOwner > refreshedProjection, "canonical result owner must receive the refreshed bonus grant result");
assert.ok(bonusCommit > refreshedOwner, "bonus receipt must commit only after the refreshed projection");
assert.match(source, /applied\.push\(\.\.\.chest\.operations\.map[\s\S]*\.\.\.commitBonus\(runtime, projected\)\)/);

console.log("Treasure Map post-Battle Bag owner smoke: PASS");
