import assert from "node:assert/strict";
import { SAFARI_BATTLE_PHASE } from "../runtime/safari-battle-orchestrator.js";
import { attemptSafariFlee } from "../runtime/safari-flee-command.js";

globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};
globalThis.window = { dispatchEvent() { return true; } };

const web = await import("../runtime/safari-web-playable-integration.js");

async function startWildRuntime({ reserve = false } = {}) {
  const runtime = web.createSafariPlayableRuntime();
  const state = runtime.variables.mapless;
  if (reserve) {
    const backup = structuredClone(runtime.player.party[0]);
    backup.personal_id = Number(backup.personal_id ?? 1) + 7400;
    backup.hp = backup.max_hp;
    backup.moves = backup.moves.map((move) => typeof move === "string" ? move : { ...move });
    runtime.player.party.push(backup);
  }
  state.board_events[0] = { kind: "wild", type: "BUG", slot: 0 };
  state.board_revealed[0] = true;
  state.board_consumed[0] = false;
  state.board_visited[0] = false;
  state.battle = null;
  state.location = "day_board";
  const started = await web.activateSafariDayBoardCell(runtime, 0);
  assert.equal(started.result, "dispatched");
  assert.ok(state.battle && state.battle.kind === "wild" && !state.battle.completed);
  return { runtime, state };
}

// Failed RUN where the foe response is survived: one turn is consumed and COMMAND returns.
{
  const { runtime, state } = await startWildRuntime();
  const active = runtime.player.party[0];
  active.max_hp = Math.max(500, Number(active.max_hp ?? 1));
  active.hp = active.max_hp;
  active.stats.DEFENSE = 999;
  active.stats.SPECIAL_DEFENSE = 999;
  active.stats.SPEED = 1;
  const movesBefore = structuredClone(active.moves);

  state.battle.foe.moves = [{ id: "TACKLE", ppup: 0, pp: 35 }];
  state.battle.foe.stats.ATTACK = 1;
  state.battle.foe.stats.SPECIAL_ATTACK = 1;
  state.battle.foe.stats.SPEED = 999;

  const hpBefore = Number(active.hp);
  const turnBefore = Number(state.battle.turn ?? 1);
  const failed = attemptSafariFlee(runtime, { runRandomSeed: 1, randomRoll: 255 });

  assert.equal(failed.escaped, false);
  assert.equal(failed.blocked, false);
  assert.equal(failed.resolution.reason, "escape_failed");
  assert.ok(Number(failed.resolution.rate) < 256,
    "deterministic failed RUN fixture must stay on the canonical random escape branch");
  assert.equal(failed.turnConsumed, true);
  assert.equal(
    (failed.opponentResponse?.operations ?? []).filter((operation) => operation.op === "use_move" && operation.actor === "foe").length,
    1,
    "failed RUN must grant exactly one foe response");
  assert.ok(Number(runtime.player.party[0].hp) > 0,
    "survival branch must keep the active Pokemon able after the foe response");
  assert.ok(Number(runtime.player.party[0].hp) <= hpBefore);
  assert.deepEqual(runtime.player.party[0].moves, movesBefore,
    "failed RUN must not consume player move PP");
  assert.equal(Boolean(state.battle.player_replacement_required), false);
  assert.equal(state.battle.phase, SAFARI_BATTLE_PHASE.COMMAND,
    "survived foe response after failed RUN must return to COMMAND");
  assert.equal(Number(state.battle.turn), turnBefore + 1,
    "failed RUN plus one foe response must consume exactly one Battle turn");
  assert.equal(Boolean(state.board_consumed[0]), false,
    "failed RUN must not consume the Board cell while Battle continues");
}

// Failed RUN where the foe response KOs the active: central REPLACEMENT owns continuation.
{
  const { runtime, state } = await startWildRuntime({ reserve: true });
  const active = runtime.player.party[0];
  active.max_hp = Math.max(500, Number(active.max_hp ?? 1));
  active.hp = 1;
  active.stats.DEFENSE = 1;
  active.stats.SPECIAL_DEFENSE = 1;
  active.stats.SPEED = 1;
  const movesBefore = structuredClone(active.moves);

  const reserve = runtime.player.party[1];
  reserve.max_hp = Math.max(500, Number(reserve.max_hp ?? 1));
  reserve.hp = reserve.max_hp;
  reserve.stats.DEFENSE = 999;
  reserve.stats.SPECIAL_DEFENSE = 999;
  reserve.stats.SPEED = 999;

  state.battle.foe.moves = [{ id: "SWIFT", ppup: 0, pp: 20 }];
  state.battle.foe.stats.ATTACK = 999;
  state.battle.foe.stats.SPECIAL_ATTACK = 999;
  state.battle.foe.stats.SPEED = 999;

  const turnBefore = Number(state.battle.turn ?? 1);
  const failed = attemptSafariFlee(runtime, { runRandomSeed: 1, randomRoll: 255 });

  assert.equal(failed.escaped, false);
  assert.equal(failed.blocked, false);
  assert.equal(failed.resolution.reason, "escape_failed");
  assert.equal(failed.turnConsumed, true);
  assert.equal(
    (failed.opponentResponse?.operations ?? []).filter((operation) => operation.op === "use_move" && operation.actor === "foe").length,
    1,
    "KO branch of failed RUN must still grant exactly one foe response");
  assert.deepEqual(runtime.player.party[0].moves, movesBefore,
    "failed RUN KO branch must not consume player move PP");
  assert.equal(Number(runtime.player.party[0].hp), 0);
  assert.equal(Boolean(state.battle.player_replacement_required), true);
  assert.equal(state.battle.phase, SAFARI_BATTLE_PHASE.REPLACEMENT,
    "KO from failed-RUN foe response must stop at central REPLACEMENT");
  assert.ok((state.battle.player_replacement_options ?? []).some((option) => Number(option.partyIndex) === 1));
  assert.equal(Number(state.battle.turn), turnBefore + 1);

  const replacementTurn = Number(state.battle.turn);
  const replacement = await web.replaceSafariBattlePlayer(runtime, 1);
  assert.equal(replacement.result, "replaced");
  assert.equal(Number(state.battle.player_party_index), 1);
  assert.equal(state.battle.phase, SAFARI_BATTLE_PHASE.COMMAND);
  assert.equal(Boolean(state.battle.player_replacement_required), false);
  assert.equal(Number(state.battle.turn), replacementTurn,
    "forced replacement after failed RUN must not consume another Battle turn");

  const selected = runtime.player.party[1];
  selected.stats.ATTACK = 999;
  selected.stats.SPECIAL_ATTACK = 999;
  selected.stats.SPEED = 999;
  state.battle.foe.hp = 1;
  state.battle.foe.stats.DEFENSE = 1;
  state.battle.foe.stats.SPECIAL_DEFENSE = 1;
  const moveId = typeof selected.moves[0] === "string" ? selected.moves[0] : selected.moves[0]?.id;
  assert.ok(moveId);
  const final = await web.resolveSafariBattleRound(runtime, moveId);
  assert.equal(final.decision, 1);
  assert.equal(state.battle.completed, true);

  const returned = await web.returnSafariToDayBoard(runtime);
  assert.equal(returned.target, "day_board");
  assert.equal(state.location, "day_board");
  assert.equal(state.battle, null);
  assert.equal(Boolean(state.board_consumed[0]), true);
  assert.equal(Boolean(state.board_visited[0]), true);
}

console.log("Safari failed RUN -> one foe response -> COMMAND/REPLACEMENT continuations: PASS");
