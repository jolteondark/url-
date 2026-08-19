import assert from "node:assert/strict";
import { finalizeNormalBattle } from "../runtime/safari-normal-battle-finalize.js";

const runtime = {
  player: { party: [{ species: "EEVEE", hp: 0, max_hp: 20, egg: false }] },
  bag: { slots: [], money: 0 },
  variables: {
    mapless: {
      day: 1,
      mapless_run_active: true,
      mapless_run_prepared: true,
      mapless_run_end_pending: false,
      mapless_carry_class: "general",
      board_events: [{ kind: "wild", type: "NORMAL", slot: 0 }],
      board_revealed: [true],
      board_consumed: [false],
      board_visited: [false],
      notice: "",
      battle: {
        kind: "wild",
        board_index: 0,
        turn: 2,
        decision: 2,
        completed: false,
        lifecycle_phase: "post_faint",
        lifecycle_history: ["command", "resolving_action", "post_faint"],
        foe: { species: "RATTATA", level: 5, hp: 10, max_hp: 20 },
        encounter: { species_id: "RATTATA", species_name: "RATTATA", level: 5 },
        last_operations: [{ op: "faint", target: "player", battleTurn: 1 }],
        presentation: [{ type: "faint", target: "player" }],
      },
    },
  },
};

const state = runtime.variables.mapless;
const battle = state.battle;
const operations = finalizeNormalBattle(runtime);
assert.equal(battle.completed, true);
assert.equal(battle.lifecycle_phase, "completed");
assert.deepEqual(battle.lifecycle_history, ["command", "resolving_action", "post_faint", "post_loss", "completed"]);
assert.equal(state.mapless_run_end_pending, true, "all-fainted decision 2 must mark Run End in the terminal tail");
assert.equal(battle.return_target, "home");
assert.equal(state.board_consumed[0], true);
assert.equal(state.board_visited[0], true);
assert.equal(operations.filter((operation) => operation.op === "mark_run_end").length, 1);
assert.equal(operations.filter((operation) => operation.op === "request_save").length, 1);
assert.equal(battle.presentation.filter((event) => event.type === "battle_result" && event.decision === 2).length, 1);
assert.deepEqual(finalizeNormalBattle(runtime), [], "loss finalization must be idempotent");
assert.equal(battle.presentation.filter((event) => event.type === "battle_result").length, 1);

console.log("Safari terminal all-fainted loss -> post_loss -> Run End -> Result lifecycle: ok");
