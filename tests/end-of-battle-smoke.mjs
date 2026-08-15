import assert from "node:assert/strict";
import { createPokemonRuntime } from "../runtime/pokemon-runtime.js";
import { resolveBattleRuntimeIntegration } from "../runtime/battle-runtime-integration.js";

function run(endOfBattleInput) {
  return resolveBattleRuntimeIntegration({
    pokemon: createPokemonRuntime({ species: "RATTATA", level: 5, hp: 20, max_hp: 20, moves: [] }),
    sendOuts: [[0, "RATTATA"]],
    allowIncompleteBattle: false,
    battleInput: {
      useCanonicalAccuracyDamage: true,
      rounds: [{ actions: [], priorityOrder: [], endJudgeState: { foeAllFainted: true } }],
      endOfBattleInput,
    },
  });
}

const capture = run({ wildBattle: true, caughtPokemonCount: 1, internalBattle: false });
assert.equal(capture.turn.endOfBattleResolution.oldDecision, 1);
assert.equal(capture.turn.endOfBattleResolution.decision, 4);
assert.equal(capture.battleResultHandoff.decision, 4);
assert.ok(capture.turn.operations.some((operation) => operation.op === "record_store_caught_pokemon_request"));
assert.ok(capture.turn.operations.some((operation) => operation.op === "gain_money_request" && operation.reason === "capture_pay_day"));

const trainer = run({ trainerBattle: true, opponentCount: 1, internalBattle: true });
assert.equal(trainer.battleResultHandoff.decision, 1);
assert.ok(trainer.turn.operations.some((operation) => operation.op === "trainer_battle_success_request"));
assert.ok(trainer.turn.operations.some((operation) => operation.op === "gain_money_request" && operation.reason === "battle_win"));
assert.ok(trainer.turn.operations.some((operation) => operation.op === "end_of_battle_complete" && operation.decision === 1));

console.log(JSON.stringify({ captureDecision: 4, trainerDecision: 1, source: "private-main-m0294" }));
