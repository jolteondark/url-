import assert from "node:assert/strict";
import fs from "node:fs";

const owner = fs.readFileSync(new URL("../runtime/safari-fake-nurse-interaction.js", import.meta.url), "utf8");
const presentation = fs.readFileSync(new URL("../fake-nurse-check-id-presentation.js", import.meta.url), "utf8");
const index = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

assert.match(owner, /choice:\s*"check_id"/, "Fake Nurse must dispatch canonical check_id");
assert.match(owner, /healSafariPartyPercent\(runtime,50\)/, "real ID-check half-price route must use shared 50% heal owner");
assert.match(owner, /preflightSafariSharedSmallItemReward/, "fake ID-check flee reward must use shared small-reward owner");
assert.match(owner, /activateSafariNormalEventTrainerBattle/, "fake ID-check confrontation must use shared trainer Battle owner");
assert.match(owner, /registerSafariNormalEventBattleContinuation\("fake_nurse"/, "Fake Nurse trainer Battle must resume through shared continuation registry");
assert.match(owner, /hasSafariUsablePartyType\(runtime,"DARK","PSYCHIC"\)/, "canonical DARK/PSYCHIC warning must use shared type owner");
assert.doesNotMatch(owner, /start_trainer_battle\s*\(/, "event adapter must not reimplement trainer Battle mechanics");

assert.match(presentation, /check_id:heal/, "Safari UI must expose ID-check + half-price heal route");
assert.match(presentation, /check_id:leave/, "Safari UI must expose ID-check + decline route");
assert.match(presentation, /safariFakeNurseWarning/, "Safari UI must surface canonical fake warning when shared type owner detects it");
assert.match(index, /safari-fake-nurse-interaction\.js\?v=20260827-1315/, "Safari import map must fetch the post-ID-check Fake Nurse owner");
assert.match(index, /fake-nurse-check-id-presentation\.js\?v=20260827-1315/, "Safari entry must load the ID-check presentation sidecar");

console.log("safari fake nurse check-id smoke: ok");
