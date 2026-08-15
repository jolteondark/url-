import assert from "node:assert/strict";
import { createPokemonRuntime } from "../runtime/pokemon-runtime.js";
import { resolveBattleRuntimeIntegration } from "../runtime/battle-runtime-integration.js";

const pokemon = createPokemonRuntime({ species: "RATTATA", level: 5, hp: 20, max_hp: 20, moves: [] });
const baseRound = { commandEntries: [], actions: [], priorityEntries: [], attackPhaseInput: { battlers: [] } };
const continuing = resolveBattleRuntimeIntegration({
  pokemon, sendOuts: [[0, "RATTATA"]], allowIncompleteBattle: true,
  battleInput: { useAttackPhaseScheduler: true, useCanonicalAccuracyDamage: true, rounds: [baseRound] },
});
const schedulerOps = continuing.attackPhaseScheduling.operations.map((operation) => operation.op);
assert.equal(continuing.turn.decision, 0);
assert.equal(continuing.turn.awaitingNextRound, true);
assert.ok(schedulerOps.indexOf("priority_change_messages_request") < schedulerOps.indexOf("attack_phase_call_request"));
assert.ok(schedulerOps.indexOf("attack_phase_switch_request") < schedulerOps.indexOf("attack_phase_items_request"));
assert.ok(schedulerOps.indexOf("attack_phase_items_request") < schedulerOps.indexOf("mega_evolution_request"));
assert.deepEqual(continuing.combatTrace.rounds[0].attackPhaseInput, { battlers: [] });

const stopped = resolveBattleRuntimeIntegration({
  pokemon, sendOuts: [[0, "RATTATA"]], allowIncompleteBattle: true,
  battleInput: {
    useAttackPhaseScheduler: true,
    useCanonicalAccuracyDamage: true,
    rounds: [{ ...baseRound, attackPhaseInput: { battlers: [], decisionAfterSwitch: 2 } }],
  },
});
assert.equal(stopped.attackPhaseScheduling.stoppedAfter, "switch");
assert.equal(stopped.turn.decision, 2);
assert.equal(stopped.battleResultHandoff.decision, 2);
assert.ok(!stopped.attackPhaseScheduling.operations.some((operation) => operation.op === "attack_phase_items_request"));
assert.ok(!stopped.turn.operations.some((operation) => operation.op === "end_of_round_phase"));

const whole = resolveBattleRuntimeIntegration({
  pokemon, sendOuts: [[0, "RATTATA"]], allowIncompleteBattle: false,
  battleInput: {
    useAttackPhaseScheduler: true,
    useCanonicalAccuracyDamage: true,
    rounds: [{ ...baseRound, endJudgeState: { foeAllFainted: true } }],
  },
});
assert.equal(whole.turn.decision, 1);
assert.ok(whole.turn.operations.some((operation) => operation.op === "attack_phase_switch_request"));
assert.ok(whole.turn.operations.some((operation) => operation.op === "attack_phase_items_request"));
assert.ok(whole.turn.operations.some((operation) => operation.op === "mega_evolution_request"));

console.log(JSON.stringify({ incremental: true, stoppedDecision: 2, wholeDecision: 1, source: "private-main-m0298" }));
