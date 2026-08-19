import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { projectSafariStatStagePresentationOperations } from "../runtime/safari-stat-stage-presentation.js";
import { formatSafariBattlePresentationEvent } from "../battle-presentation-narration.js";

const resolved = {
  battleRuntimeIntegration: {
    combatTrace: {
      rounds: [{
        actions: [{
          battlerIndex: 0,
          targetBattlerIndex: 1,
          statStageResolution: {
            applied: [{ battlerIndex: 1, stat: "ATTACK", requestedDelta: -1, appliedDelta: -1, before: 0, after: -1 }],
          },
        }],
      }],
    },
  },
};
const operations = [
  { op: "use_move", action: 0, actor: "player", target: "foe", moveId: "GROWL", round: 1 },
  { op: "accuracy_check", action: 0, actor: "player", target: "foe", hit: true, round: 1 },
];
const projected = projectSafariStatStagePresentationOperations(resolved, operations);
assert.deepEqual(projected.map((entry) => entry.op), ["use_move", "accuracy_check", "stat_stage_change"]);
assert.deepEqual(projected[2], {
  op: "stat_stage_change", action: 0, actor: "player", target: "foe", battlerIndex: 1,
  stat: "ATTACK", requestedDelta: -1, appliedDelta: -1, before: 0, after: -1,
  round: 1, battleTurn: undefined,
});
assert.match(formatSafariBattlePresentationEvent({ type: "stat_stage_change", target: "foe", targetSpecies: "RATTATA", stat: "ATTACK", appliedDelta: -1 }), /こうげき.*下がった/);
assert.match(formatSafariBattlePresentationEvent({ type: "stat_stage_change", target: "player", targetSpecies: "EEVEE", stat: "SPEED", appliedDelta: 2 }), /すばやさ.*ぐーんと.*上がった/);

const capped = projectSafariStatStagePresentationOperations({
  battleRuntimeIntegration: { combatTrace: { rounds: [{ actions: [{ statStageResolution: { applied: [{ battlerIndex: 0, stat: "SPEED", requestedDelta: 2, appliedDelta: 0, before: 6, after: 6 }] } }] }] } },
}, [{ op: "accuracy_check", action: 0, actor: "player", target: "foe", hit: true, round: 2 }]);
assert.equal(capped.at(-1).appliedDelta, 0);
assert.match(formatSafariBattlePresentationEvent({ type: "stat_stage_change", target: "player", targetSpecies: "EEVEE", stat: "SPEED", appliedDelta: 0 }), /もう変わらない/);

const missed = projectSafariStatStagePresentationOperations(resolved, [{ op: "accuracy_check", action: 0, actor: "player", target: "foe", hit: false, round: 1 }]);
assert.equal(missed.some((entry) => entry.op === "stat_stage_change"), false, "missed owner action must not narrate a stage change");

const blocked = projectSafariStatStagePresentationOperations({
  battleRuntimeIntegration: { combatTrace: { rounds: [{ actions: [{ moveSkipped: true, statStageResolution: undefined }] }] } },
}, [{ op: "continue_status_request", action: 0, actor: "player", target: "foe", status: "PARALYSIS", round: 1 }]);
assert.equal(blocked.some((entry) => entry.op === "stat_stage_change"), false, "status-cancelled actions must not synthesize stage presentation");

const normalRoundSource = fs.readFileSync(fileURLToPath(new URL("../runtime/safari-normal-battle-round.js", import.meta.url)), "utf8");
assert.match(normalRoundSource, /projectSafariStatStagePresentationOperations\(resolved, operations\)/);
assert.match(normalRoundSource, /operation\.op === \"stat_stage_change\"/);
assert.doesNotMatch(normalRoundSource, /resolveBattleStatStageChangesCanonical/);

console.log("Safari stat-stage presentation smoke: PASS");
