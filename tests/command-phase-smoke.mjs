import assert from "node:assert/strict";
import { createPokemonRuntime } from "../runtime/pokemon-runtime.js";
import { resolveBattleRuntimeIntegration } from "../runtime/battle-runtime-integration.js";

const pokemon = createPokemonRuntime({ species: "RATTATA", level: 5, hp: 20, max_hp: 20, moves: [] });
const result = resolveBattleRuntimeIntegration({
  pokemon,
  sendOuts: [[0, "RATTATA"]],
  allowIncompleteBattle: false,
  battleInput: {
    useCanonicalAccuracyDamage: true,
    rounds: [{
      commandEntries: [
        { battlerIndex: 0, ownedByPlayer: true, selectedMoveIndex: 0, selectedMoveId: "TACKLE" },
        { battlerIndex: 1, ownedByPlayer: false, selectedMoveIndex: 0, selectedMoveId: "GROWL" },
      ],
      commandPhaseInput: {
        battlers: [
          { battlerIndex: 0, present: true, canShowCommands: true },
          { battlerIndex: 1, present: true, canShowCommands: true },
        ],
        megaEvolution: [[0], [1]],
        decisionAfterPlayer: 2,
      },
      actions: [],
    }],
  },
});

const ops = result.turn.operations;
assert.equal(result.battleResultHandoff.decision, 2);
assert.equal(result.pokemon.hp, 20);
assert.equal(ops.some((op) => op.op === "begin_command_phase"), true);
assert.deepEqual(ops.filter((op) => op.op === "reset_mega_evolution").map((op) => [op.side, op.owner]), [[0, 0], [1, 0]]);
assert.equal(ops.some((op) => op.op === "command_phase_loop" && op.phase === "player"), true);
assert.equal(ops.some((op) => op.op === "command_phase_loop" && op.phase === "ai"), false);
assert.equal(ops.some((op) => op.op === "attack_phase"), false);
assert.equal(result.battleStatusIntegration, undefined);
assert.equal(result.battleHeldItemIntegration, undefined);
assert.equal(result.battleExpIntegration, undefined);
assert.equal(result.combatTrace.rounds[0].commandPhaseInput.decisionAfterPlayer, 2);

console.log("PASS 11/11");
console.log(JSON.stringify({ decision: result.battleResultHandoff.decision, hp: result.pokemon.hp, sourceOps: ops.filter((op) => ["begin_command_phase", "reset_mega_evolution", "command_phase_loop", "command_phase_decision_gate"].includes(op.op)) }));
