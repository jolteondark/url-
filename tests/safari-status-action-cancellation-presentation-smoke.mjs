import assert from "node:assert/strict";
import { prepareCombatTurnInputCanonical } from "../runtime/battle-core-combat-turn.js";
import { resolveBattleLoopCanonical } from "../runtime/battle-core-battle-loop.js";
import { resolveBrowserBattleRound } from "../runtime/browser-battle-round-runtime.js";
import { formatSafariBattlePresentationEvent } from "../battle-presentation-narration.js";

function action(index, tryUseMoveInput = {}) {
  return {
    kind: "move",
    battlerIndex: index,
    targetBattlerIndex: index === 0 ? 1 : 0,
    moveId: index === 0 ? "TACKLE" : "SCRATCH",
    moveIndex: 0,
    actorHpBefore: 100,
    actorTotalHp: 100,
    hpBefore: 100,
    totalHp: 100,
    accuracyInput: { baseAccuracy: 100, randomRoll: 0 },
    fixedDamageInput: { damage: 10, functionCode: "test" },
    useMoveInput: { moveId: index === 0 ? "TACKLE" : "SCRATCH", moveIndex: 0, targetIndex: index === 0 ? 1 : 0, movePresent: true, tryUseMoveInput },
  };
}

function loopFor(firstTry, secondTry = {}) {
  const prepared = prepareCombatTurnInputCanonical({
    rounds: [{ priorityOrder: [0, 1], actions: [action(0, firstTry), action(1, secondTry)], attackDecision: 1 }],
  });
  return resolveBattleLoopCanonical(prepared).operations;
}

function actionOps(operations, actionIndex) {
  return operations.filter((operation) => Number(operation.action) === actionIndex);
}

for (const [label, input, reasonOp] of [
  ["sleep", { status: "SLEEP", statusCount: 2 }, "continue_status_request"],
  ["frozen", { status: "FROZEN", frozenThawRoll: 99 }, "continue_status_request"],
  ["paralysis", { status: "PARALYSIS", paralysisRoll4: 0 }, "continue_status_request"],
  ["flinch", { flinch: true }, "display_flinched"],
]) {
  const operations = loopFor(input);
  const first = actionOps(operations, 0);
  const second = actionOps(operations, 1);
  assert.ok(first.some((operation) => operation.op === reasonOp), `${label}: owner reason operation must be exposed`);
  assert.ok(first.some((operation) => operation.op === "try_use_move_failed"), `${label}: owner failure must be exposed`);
  assert.equal(first.some((operation) => operation.op === "use_move"), false, `${label}: canceled actor must not emit move presentation`);
  assert.equal(first.some((operation) => ["accuracy_check", "calc_damage", "reduce_hp"].includes(operation.op)), false, `${label}: canceled actor must not emit attack/damage presentation`);
  assert.equal(second.filter((operation) => operation.op === "use_move").length, 1, `${label}: surviving later actor must still act once`);
}

{
  const wake = loopFor({ status: "SLEEP", statusCount: 1 });
  const first = actionOps(wake, 0);
  assert.ok(first.some((operation) => operation.op === "cure_status_request" && operation.status === "SLEEP"));
  assert.ok(first.some((operation) => operation.op === "use_move"), "waking actor must continue into its owner-approved move");
  assert.ok(first.findIndex((operation) => operation.op === "cure_status_request") < first.findIndex((operation) => operation.op === "use_move"), "wake presentation must precede move presentation");
}

{
  const thaw = loopFor({ status: "FROZEN", frozenThawRoll: 0 });
  const first = actionOps(thaw, 0);
  assert.ok(first.some((operation) => operation.op === "cure_status_request" && operation.status === "FROZEN"));
  assert.ok(first.findIndex((operation) => operation.op === "cure_status_request") < first.findIndex((operation) => operation.op === "use_move"), "thaw presentation must precede move presentation");
}

{
  const confusion = loopFor({
    confusionTurns: 2,
    mechanicsGeneration: 9,
    confusionRoll: 0,
    confusionDamageInput: {
      hpBefore: 100,
      totalHp: 100,
      damageInput: { level: 50, attack: 100, defense: 100, randomRoll: 100 },
    },
  });
  const first = actionOps(confusion, 0);
  const confusedAt = first.findIndex((operation) => operation.op === "display_confused");
  const selfDamageAt = first.findIndex((operation) => operation.op === "reduce_self_hp");
  const selfMessageAt = first.findIndex((operation) => operation.op === "display_confusion_self_damage");
  const failedAt = first.findIndex((operation) => operation.op === "try_use_move_failed");
  assert.ok(confusedAt >= 0 && selfDamageAt > confusedAt && selfMessageAt > selfDamageAt && failedAt > selfMessageAt,
    "confusion self-hit presentation order must be the mechanics-owner operation order");
  assert.equal(first.some((operation) => operation.op === "use_move"), false, "confusion self-hit must cancel selected move presentation");
  assert.equal(first.some((operation) => operation.op === "reduce_hp"), false, "confusion self-hit must be tagged as actor self-damage, not target damage");
}

{
  const prepared = prepareCombatTurnInputCanonical({
    rounds: [
      { priorityOrder: [0, 1], actions: [action(0, { flinch: true }), action(1)] },
      { priorityOrder: [0, 1], actions: [action(0), action(1)], attackDecision: 1 },
    ],
  });
  const operations = resolveBattleLoopCanonical(prepared).operations;
  assert.equal(operations.filter((operation) => operation.round === 1 && operation.action === 0 && operation.op === "use_move").length, 0);
  assert.equal(operations.filter((operation) => operation.round === 2 && operation.action === 0 && operation.op === "use_move").length, 1,
    "flinch must be transient to the owning round and must not leak into the next round");
}

const moveMasters = {
  TACKLE: { id: "TACKLE", name: "Tackle", category: "Physical", power: 40, accuracy: 100, total_pp: 35, priority: 0, type: "NORMAL" },
};
const pokemon = (status, speed) => ({
  species: "EEVEE",
  level: 50,
  hp: 100,
  max_hp: 100,
  status,
  types: ["NORMAL"],
  stats: { ATTACK: 100, DEFENSE: 100, SPECIAL_ATTACK: 100, SPECIAL_DEFENSE: 100, SPEED: speed },
  moves: [{ id: "TACKLE", pp: 35, ppup: 0 }],
});
const browserRound = resolveBrowserBattleRound({
  player: pokemon("PARALYSIS", 100),
  foe: pokemon("NONE", 60),
  playerParty: [pokemon("PARALYSIS", 100)],
  foeParty: [pokemon("NONE", 60)],
  selectedMoveId: "TACKLE",
  foeMoveId: "TACKLE",
  moveMasters,
  combatRandomSeed: 3,
  priorityRandomSeed: 1,
});
const playerOps = browserRound.operations.filter((operation) => operation.actor === "player");
assert.equal(playerOps.some((operation) => operation.op === "use_move"), false, "browser-like full paralysis must not emit player move presentation");
assert.equal(browserRound.ppIntegration.commits.some((commit) => commit.actor === "player"), false, "canceled action must not decrement player PP");
assert.equal(browserRound.operations.filter((operation) => operation.actor === "foe" && operation.op === "use_move").length, 1, "later foe action must still resolve exactly once");

assert.equal(formatSafariBattlePresentationEvent({ type: "action_blocked", actor: "player", actorSpecies: "EEVEE", reason: "paralysis" }, {}), "EEVEEは体がしびれて動けない！");
assert.equal(formatSafariBattlePresentationEvent({ type: "action_blocked", actor: "foe", actorSpecies: "PIKACHU", reason: "flinch" }, {}), "PIKACHUはひるんで技が出せない！");
assert.equal(formatSafariBattlePresentationEvent({ type: "status_recovered", actor: "player", actorSpecies: "EEVEE", status: "SLEEP" }, {}), "EEVEEは目を覚ました！");
assert.equal(formatSafariBattlePresentationEvent({ type: "status_recovered", actor: "player", actorSpecies: "EEVEE", status: "FROZEN" }, {}), "EEVEEのこおりが溶けた！");
assert.equal(formatSafariBattlePresentationEvent({ type: "confusion_active", actor: "player", actorSpecies: "EEVEE" }, {}), "EEVEEはこんらんしている！");
assert.equal(formatSafariBattlePresentationEvent({ type: "confusion_self_hit", actor: "player", actorSpecies: "EEVEE" }, {}), "EEVEEはわけもわからず自分を攻撃した！");

console.log("Safari status/transient action cancellation presentation smoke PASS");
