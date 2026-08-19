import assert from "node:assert/strict";
import { finalizeNormalBattle } from "../runtime/safari-normal-battle-finalize.js";

function runtimeFixture(kind = "wild", decision = 1) {
  const foe = { species: "RATTATA", level: 5, hp: 0, max_hp: 20 };
  const trainer = kind === "trainer" ? { trainer_full_name: "TEST TRAINER" } : null;
  return {
    player: {
      party: [{
        species: "EEVEE",
        level: 6,
        hp: 25,
        max_hp: 25,
        ready_to_evolve: true,
      }],
    },
    bag: { slots: [], money: 1000 },
    variables: {
      mapless: {
        day: 1,
        mapless_run_active: true,
        mapless_run_prepared: true,
        mapless_run_end_pending: false,
        mapless_carry_class: "general",
        board_events: [kind === "wild"
          ? { kind: "wild", type: "NORMAL", slot: 0 }
          : { kind: "trainer", trainer_full_name: "TEST TRAINER", slot: 0 }],
        board_revealed: [true],
        board_consumed: [false],
        board_visited: [false],
        notice: "",
        battle: {
          kind,
          board_index: 0,
          turn: 2,
          decision,
          completed: false,
          lifecycle_phase: decision === 1 ? "post_victory" : "post_loss",
          foe,
          encounter: kind === "wild" ? { species_id: "RATTATA", species_name: "RATTATA", level: 5 } : null,
          trainer,
          prize_money: kind === "trainer" ? 321 : null,
          player_party_index: 0,
          trainer_exp_gained: kind === "trainer" ? 40 : 0,
          exp_gained: 60,
          last_operations: [
            { op: "faint", target: "foe", battleTurn: 1 },
            { op: "gain_exp", amount: 60, scope: "exp", battleTurn: 1 },
            { op: "level_up", level: 6, scope: "exp", battleTurn: 1 },
            { op: "learn_move", move: "QUICKATTACK", scope: "exp", battleTurn: 1 },
          ],
          presentation: [
            { type: "faint", target: "foe" },
            { type: "exp_gained", amount: 60 },
            { type: "level_up", level: 6 },
            { type: "move_learned", moveId: "QUICKATTACK" },
          ],
        },
      },
    },
  };
}

// Victory tail: faint/EXP/level/move are already round-owned. Finalization must
// continue from there through evolution checkpoint -> reward -> Board -> save -> Result,
// and only then expose completed/return_target. A second finalize is a no-op.
{
  const runtime = runtimeFixture("wild", 1);
  const state = runtime.variables.mapless;
  const battle = state.battle;
  const initialOperationCount = battle.last_operations.length;
  const operations = finalizeNormalBattle(runtime);

  assert.equal(battle.completed, true);
  assert.equal(battle.lifecycle_phase, "completed");
  assert.equal(battle.terminal_finalize_applied, true);
  assert.equal(battle.return_target, "day_board");
  assert.equal(state.board_consumed[0], true, "terminal victory must consume the Board event");
  assert.equal(state.board_visited[0], true, "terminal victory must commit Board visited state");

  const evolutionIndex = operations.findIndex((operation) => operation.op === "battle_evolution_checkpoint");
  const rewardIndex = operations.findIndex((operation) => operation.scope === "reward");
  const boardIndex = operations.findIndex((operation) => String(operation.op ?? "").startsWith("activate_"));
  const saveIndex = operations.findIndex((operation) => operation.op === "request_save");
  assert.ok(evolutionIndex >= 0 && operations[evolutionIndex].ready === true,
    "level/move tail must reach the existing ready-to-evolve checkpoint before reward");
  assert.ok(rewardIndex > evolutionIndex, "victory reward must follow the evolution checkpoint");
  assert.ok(boardIndex > rewardIndex, "Board completion must follow victory reward");
  assert.ok(saveIndex > boardIndex, "save request must follow Board completion");

  const resultEvents = battle.presentation.filter((event) => event.type === "battle_result");
  assert.equal(resultEvents.length, 1, "terminal victory must emit one Result");
  assert.equal(resultEvents[0].expGained, 60);
  assert.equal(battle.last_operations.slice(0, initialOperationCount).filter((operation) => operation.scope === "exp").length, 3,
    "finalize must preserve, not duplicate, round-owned EXP/level/move operations");
  assert.equal(battle.last_operations.slice(initialOperationCount).some((operation) => operation.scope === "exp"), false,
    "terminal tail must not recalculate EXP");

  const rewardSlotsAfterFirst = JSON.stringify(runtime.bag.slots);
  const consumedAfterFirst = JSON.stringify(state.board_consumed);
  assert.deepEqual(finalizeNormalBattle(runtime), [], "finalize must be explicitly idempotent");
  assert.equal(JSON.stringify(runtime.bag.slots), rewardSlotsAfterFirst);
  assert.equal(JSON.stringify(state.board_consumed), consumedAfterFirst);
  assert.equal(battle.presentation.filter((event) => event.type === "battle_result").length, 1);
}

// Trainer terminal tail uses the same state machine. Prize and reward are once-only,
// while the defeated-foe EXP aggregate remains the amount already committed by rounds.
{
  const runtime = runtimeFixture("trainer", 1);
  const battle = runtime.variables.mapless.battle;
  const operations = finalizeNormalBattle(runtime);
  assert.equal(operations.filter((operation) => operation.op === "trainer_prize_money").length, 1);
  assert.equal(operations.filter((operation) => operation.scope === "reward").length > 0, true);
  assert.equal(operations.filter((operation) => operation.op === "request_save").length, 1);
  assert.equal(battle.presentation.filter((event) => event.type === "battle_result").length, 1);
  assert.equal(battle.presentation.find((event) => event.type === "battle_result")?.expGained, 100);
  assert.deepEqual(finalizeNormalBattle(runtime), []);
}

console.log("Safari post-faint/post-victory terminal lifecycle and idempotent finalize: ok");
