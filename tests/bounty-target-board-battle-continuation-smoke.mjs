import assert from "node:assert/strict";
import fs from "node:fs";

const command = fs.readFileSync(new URL("../runtime/safari-pokemon-center-command.js", import.meta.url), "utf8");
const interaction = fs.readFileSync(new URL("../runtime/safari-bounty-target-interaction.js", import.meta.url), "utf8");

assert.match(command, /normal_event_id === "bounty_target"\) return startSafariBountyTargetBattle\(runtime, index\)/);
assert.match(interaction, /activateSafariNormalEventTrainerBattle/);
assert.match(interaction, /registerSafariNormalEventBattleContinuation\("bounty_target"/);
assert.match(interaction, /resolveBountyTarget\(\{[\s\S]*battle_outcome:victory \? 1 : 0/);
assert.match(interaction, /preflightSafariSharedLargeItemReward/);
assert.match(interaction, /applySafariLargeItemReward/);
assert.match(interaction, /state\.mapless_bounty = null/);
assert.match(interaction, /request_save", reason:"normal_event_post_battle"/);
assert.doesNotMatch(interaction, /startWild\(|wild_battle/);
assert.doesNotMatch(interaction, /cannot_run\s*=|canRun\s*=|runChance/);

console.log("bounty target Board→trainer Battle→continuation smoke passed");
