import assert from "node:assert/strict";
import {
  SAFARI_BATTLE_PHASE,
  beginSafariBattleCommand,
  beginSafariBattleReturn,
  commitSafariBattleResolution,
  completeSafariBattlePresentation,
  completeSafariBattleReplacement,
  ensureSafariBattleOrchestrator,
  safariBattleCommandAllowed,
} from "../runtime/safari-battle-orchestrator.js";

function runtime(battle = {}) {
  return {
    variables: {
      mapless: {
        battle: {
          turn: 1,
          decision: 0,
          completed: false,
          ...battle,
        },
      },
    },
  };
}

{
  const rt = runtime();
  assert.equal(ensureSafariBattleOrchestrator(rt), SAFARI_BATTLE_PHASE.COMMAND);
  assert.equal(safariBattleCommandAllowed(rt), true);
  beginSafariBattleCommand(rt, "move");
  assert.equal(safariBattleCommandAllowed(rt), false, "double tap must lock as soon as ACTION_1 starts");
  const result = {
    decision: 1,
    operations: [
      { op: "use_move", actor: "player" },
      { op: "faint", target: "foe" },
      { op: "gain_exp", amount: 20 },
      { op: "level_up", level: 6 },
      { op: "learn_move", move: "GROWL" },
      { op: "level_evolution", from: "BULBASAUR", to: "IVYSAUR" },
      { op: "item_received", item: "POTION" },
      { op: "trainer_prize_money", applied: 120 },
      { op: "request_save" },
    ],
  };
  rt.variables.mapless.battle.completed = true;
  commitSafariBattleResolution(rt, result, "move");
  const battle = rt.variables.mapless.battle;
  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.REWARD_GROWTH,
    "wild KO must remain locked through growth/reward presentation");
  assert.equal(battle.completed, false, "legacy completed must stay hidden before RESULT");
  assert.equal(battle.pending_phase_after_presentation, SAFARI_BATTLE_PHASE.RESULT);
  assert.equal(safariBattleCommandAllowed(rt), false);
  assert.deepEqual(
    battle.phase_trace.map((step) => step.phase),
    ["COMMAND", "ACTION_1", "CHECK_1", "POST_FAINT", "POST_VICTORY", "REWARD_GROWTH"],
  );
  completeSafariBattlePresentation(rt, result);
  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.RESULT);
  assert.equal(battle.completed, true);
  assert.equal(battle.completed_phase, SAFARI_BATTLE_PHASE.RESULT);
  assert.equal(safariBattleCommandAllowed(rt), false);
  beginSafariBattleReturn(rt);
  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.RETURN, "RESULT must expose RETURN as the only next phase");
}

{
  const rt = runtime();
  ensureSafariBattleOrchestrator(rt);
  beginSafariBattleCommand(rt, "move");
  const result = {
    decision: 0,
    foeReplacementApplied: true,
    operations: [
      { op: "use_move", actor: "player" },
      { op: "faint", target: "foe" },
    ],
  };
  commitSafariBattleResolution(rt, result, "move");
  const battle = rt.variables.mapless.battle;
  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.REPLACEMENT,
    "trainer reserve must visibly pass through REPLACEMENT");
  assert.equal(battle.completed, false);
  assert.equal(battle.pending_phase_after_presentation, SAFARI_BATTLE_PHASE.COMMAND);
  assert.equal(battle.phase_trace.some((step) => step.phase === SAFARI_BATTLE_PHASE.RESULT), false);
  completeSafariBattlePresentation(rt, result);
  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.COMMAND);
  assert.equal(battle.phase_trace.some((step) => step.phase === SAFARI_BATTLE_PHASE.RESULT), false,
    "trainer reserve must return to COMMAND without RESULT");
}

{
  const rt = runtime({ player_replacement_required: true });
  ensureSafariBattleOrchestrator(rt);
  beginSafariBattleCommand(rt, "move");
  const result = {
    decision: 0,
    playerReplacementRequired: true,
    operations: [
      { op: "use_move", actor: "foe" },
      { op: "faint", target: "player" },
    ],
  };
  commitSafariBattleResolution(rt, result, "move");
  const battle = rt.variables.mapless.battle;
  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.REPLACEMENT);
  assert.equal(battle.pending_phase_after_presentation ?? null, null,
    "player replacement remains owner-blocked until a legal replacement is selected");
  assert.equal(battle.phase_trace.some((step) => step.phase === SAFARI_BATTLE_PHASE.ACTION_2), false,
    "foe-first player KO must not invent a player ACTION_2");
  assert.equal(safariBattleCommandAllowed(rt), false);
  battle.player_replacement_required = false;
  completeSafariBattleReplacement(rt, {});
  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.COMMAND);
  assert.equal(safariBattleCommandAllowed(rt), true);
}

for (const commandKind of ["item", "capture", "flee", "switch"]) {
  const rt = runtime();
  ensureSafariBattleOrchestrator(rt);
  beginSafariBattleCommand(rt, commandKind);
  assert.equal(safariBattleCommandAllowed(rt), false, `${commandKind} must lock commands immediately`);
  const result = commitSafariBattleResolution(rt, {
    decision: 0,
    operations: [{ op: "use_move", actor: "foe" }],
  }, commandKind);
  const battle = rt.variables.mapless.battle;
  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.CHECK_2);
  assert.equal(battle.pending_phase_after_presentation, SAFARI_BATTLE_PHASE.COMMAND);
  assert.deepEqual(
    battle.phase_trace.map((step) => step.phase),
    ["COMMAND", "ACTION_1", "CHECK_1", "ACTION_2", "CHECK_2"],
    `${commandKind} consumes ACTION_1, so one living-foe response must be ACTION_2 exactly once`,
  );
  completeSafariBattlePresentation(rt, result);
  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.COMMAND);
  assert.equal(safariBattleCommandAllowed(rt), true);
}

for (const commandKind of ["item", "capture", "flee", "switch"]) {
  const rt = runtime();
  ensureSafariBattleOrchestrator(rt);
  beginSafariBattleCommand(rt, commandKind);
  const result = commitSafariBattleResolution(rt, { decision: 0, operations: [] }, commandKind);
  const battle = rt.variables.mapless.battle;
  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.CHECK_1);
  assert.equal(battle.phase_trace.includes?.(SAFARI_BATTLE_PHASE.ACTION_2) ?? false, false);
  assert.equal(battle.phase_trace.some((step) => step.phase === SAFARI_BATTLE_PHASE.ACTION_2), false,
    `${commandKind} must not invent ACTION_2 when no foe response occurred`);
  completeSafariBattlePresentation(rt, result);
  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.COMMAND);
}

console.log("safari battle orchestrator phase smoke: PASS");
