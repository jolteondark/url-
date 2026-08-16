import assert from "node:assert/strict";
import { attemptSafariFlee } from "../runtime/safari-flee-command.js";

function runtime({ kind = "wild", origin = null, playerSpeed = 50, foeSpeed = 20 } = {}) {
  return {
    player: { party: [{ species: "EEVEE", stats: { SPEED: playerSpeed } }] },
    variables: { mapless: {
      location: "day_board",
      board_consumed: [false],
      board_visited: [false],
      battle: {
        kind,
        origin,
        board_index: 0,
        decision: 0,
        completed: false,
        run_command: 0,
        foe: { species: "RATTATA", stats: { SPEED: foeSpeed } },
      },
      last_operations: [],
      notice: "",
    } },
  };
}

const fast = runtime({ playerSpeed: 60, foeSpeed: 20 });
const escaped = attemptSafariFlee(fast, { runRandomSeed: 1, randomRoll: 255 });
assert.equal(escaped.escaped, true);
assert.equal(escaped.resolution.reason, "speed_escape");
assert.equal(fast.variables.mapless.battle, null);
assert.equal(fast.variables.mapless.board_consumed[0], true);

const slow = runtime({ playerSpeed: 1, foeSpeed: 100 });
const failed = attemptSafariFlee(slow, { runRandomSeed: 1, randomRoll: 255 });
assert.equal(failed.escaped, false);
assert.equal(failed.blocked, false);
assert.equal(failed.resolution.reason, "escape_failed");
assert.equal(failed.resolution.runCommand, 1);
assert.equal(slow.variables.mapless.battle.run_command, 1);
assert.equal(slow.variables.mapless.board_consumed[0], false);

const trainer = runtime({ kind: "trainer" });
const trainerBlocked = attemptSafariFlee(trainer, { runRandomSeed: 1, randomRoll: 0 });
assert.equal(trainerBlocked.escaped, false);
assert.equal(trainerBlocked.blocked, true);
assert.equal(trainerBlocked.resolution.reason, "trainer_battle_cannot_run");

const bounty = runtime({ origin: "village_bounty" });
const bountyBlocked = attemptSafariFlee(bounty, { runRandomSeed: 1, randomRoll: 0 });
assert.equal(bountyBlocked.escaped, false);
assert.equal(bountyBlocked.blocked, true);
assert.equal(bountyBlocked.resolution.reason, "can_run_disabled");

console.log("PASS canonical Safari flee 4/4");
