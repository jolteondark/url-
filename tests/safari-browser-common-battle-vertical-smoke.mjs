import assert from "node:assert/strict";

globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};
globalThis.window = { dispatchEvent() { return true; } };

const webPlayable = await import("../runtime/safari-web-playable-integration.js");

function moveId(move) {
  return typeof move === "string" ? move : move?.id;
}

function movePp(pokemon, id) {
  const move = (pokemon.moves ?? []).find((entry) => moveId(entry) === id);
  return typeof move === "object" && move ? Number(move.pp) : null;
}

async function startBattle(kind) {
  const runtime = webPlayable.createSafariPlayableRuntime();
  const state = runtime.variables.mapless;
  state.board_events[0] = kind === "wild"
    ? { kind: "wild", type: "BUG", slot: 0 }
    : { kind: "trainer", trainer_seed: 12345, slot: 0 };
  state.board_revealed[0] = true;
  state.board_consumed[0] = false;
  state.board_visited[0] = false;
  state.battle = null;
  state.location = "day_board";
  const started = await webPlayable.activateSafariDayBoardCell(runtime, 0);
  assert.equal(started.result, "dispatched", `${kind} Board cell must dispatch`);
  assert.ok(state.battle && !state.battle.completed, `${kind} Battle must start`);
  return { runtime, state };
}

// Wild: prove a durable nonterminal turn carries HP + PP into a terminal turn,
// then prove the completed Battle can return to the Board through the public facade.
{
  const { runtime, state } = await startBattle("wild");
  const battle = state.battle;
  const playerIndex = Number(battle.player_party_index ?? 0);
  const player = runtime.player.party[playerIndex];
  const selectedMoveId = moveId(player.moves[0]);
  assert.ok(selectedMoveId, "wild Battle must expose a player move");

  player.max_hp = Math.max(500, Number(player.max_hp ?? 1));
  player.hp = player.max_hp;
  player.stats.ATTACK = 1;
  player.stats.SPECIAL_ATTACK = 1;
  player.stats.DEFENSE = 999;
  player.stats.SPECIAL_DEFENSE = 999;
  player.stats.SPEED = 999;
  battle.foe.max_hp = Math.max(500, Number(battle.foe.max_hp ?? 1));
  battle.foe.hp = battle.foe.max_hp;
  battle.foe.stats.ATTACK = 1;
  battle.foe.stats.SPECIAL_ATTACK = 1;
  battle.foe.stats.DEFENSE = 999;
  battle.foe.stats.SPECIAL_DEFENSE = 999;

  const ppBefore = movePp(player, selectedMoveId);
  const first = await webPlayable.resolveSafariBattleRound(runtime, selectedMoveId);
  assert.equal(first.decision, 0, "wild first durable turn must stay nonterminal");
  assert.equal(state.battle.turn, 2, "wild Battle must advance exactly one turn");
  const hpAfterFirst = Number(runtime.player.party[playerIndex].hp);
  const foeHpAfterFirst = Number(state.battle.foe.hp);
  assert.ok(hpAfterFirst > 0 && hpAfterFirst <= player.max_hp, "wild player HP must remain live after first turn");
  assert.ok(foeHpAfterFirst > 0 && foeHpAfterFirst < battle.foe.max_hp, "wild foe damage must persist after first turn");
  if (ppBefore !== null) {
    assert.equal(movePp(runtime.player.party[playerIndex], selectedMoveId), ppBefore - 1,
      "wild selected move PP must decrement once and persist");
  }

  runtime.player.party[playerIndex].stats.ATTACK = 999;
  runtime.player.party[playerIndex].stats.SPECIAL_ATTACK = 999;
  state.battle.foe.hp = 1;
  const second = await webPlayable.resolveSafariBattleRound(runtime, selectedMoveId);
  assert.equal(second.decision, 1, "wild terminal KO must resolve as victory");
  assert.equal(state.battle.completed, true, "wild victory must complete Battle");
  assert.equal(state.board_consumed[0], true, "wild victory must consume the Board cell");
  assert.ok(Number(runtime.player.party[playerIndex].hp) <= hpAfterFirst,
    "wild second turn must continue from carried player HP instead of healing between turns");

  const returned = await webPlayable.returnSafariToDayBoard(runtime);
  assert.equal(returned.result, "returned", "wild completed Battle must return through the public facade");
  assert.equal(state.battle, null, "wild return must clear Battle state");
  assert.equal(state.location, "day_board", "wild return must land on Day Board");
}

// Trainer: force two opponents. First KO must stay nonterminal and replace the foe;
// final KO alone may complete the Battle and Board event.
{
  const { runtime, state } = await startBattle("trainer");
  const battle = state.battle;
  const playerIndex = Number(battle.player_party_index ?? 0);
  const player = runtime.player.party[playerIndex];
  const selectedMoveId = moveId(player.moves[0]);
  assert.ok(selectedMoveId, "trainer Battle must expose a player move");

  player.max_hp = Math.max(500, Number(player.max_hp ?? 1));
  player.hp = player.max_hp;
  player.stats.ATTACK = 999;
  player.stats.SPECIAL_ATTACK = 999;
  player.stats.DEFENSE = 999;
  player.stats.SPECIAL_DEFENSE = 999;
  player.stats.SPEED = 999;

  const firstFoe = structuredClone(battle.foe);
  const secondFoe = structuredClone(battle.foe);
  firstFoe.hp = 1;
  firstFoe.fainted = false;
  secondFoe.hp = 1;
  secondFoe.fainted = false;
  firstFoe.stats.ATTACK = 1;
  firstFoe.stats.SPECIAL_ATTACK = 1;
  secondFoe.stats.ATTACK = 1;
  secondFoe.stats.SPECIAL_ATTACK = 1;
  battle.trainer_party = [firstFoe, secondFoe];
  battle.trainer_party_index = 0;
  battle.trainer_party_order = [0, 1];
  battle.foe = structuredClone(firstFoe);

  const first = await webPlayable.resolveSafariBattleRound(runtime, selectedMoveId);
  assert.equal(first.decision, 0, "trainer first KO with reserve must remain nonterminal");
  assert.equal(state.battle.completed, false, "trainer intermediate KO must not complete Battle");
  assert.equal(state.board_consumed[0], false, "trainer intermediate KO must not consume Board completion");
  assert.equal(Number(state.battle.trainer_party_index), 1, "trainer first KO must advance to the reserve foe");
  assert.ok(Number(state.battle.foe.hp) > 0, "trainer replacement foe must be active after first KO");

  state.battle.foe.hp = 1;
  state.battle.trainer_party[1].hp = 1;
  runtime.player.party[playerIndex].stats.ATTACK = 999;
  runtime.player.party[playerIndex].stats.SPECIAL_ATTACK = 999;
  const final = await webPlayable.resolveSafariBattleRound(runtime, selectedMoveId);
  assert.equal(final.decision, 1, "trainer final KO must resolve as victory");
  assert.equal(state.battle.completed, true, "trainer final KO must complete Battle");
  assert.equal(state.board_consumed[0], true, "trainer final victory must consume the Board cell");
  assert.ok(Number(state.battle.trainer_exp_gained ?? 0) + Number(state.battle.exp_gained ?? 0) > 0,
    "trainer multi-KO victory must retain accumulated EXP");

  const returned = await webPlayable.returnSafariToDayBoard(runtime);
  assert.equal(returned.result, "returned", "trainer completed Battle must return through the public facade");
  assert.equal(state.battle, null, "trainer return must clear Battle state");
  assert.equal(state.location, "day_board", "trainer return must land on Day Board");
}

console.log("Safari common browser Battle vertical: multi-turn wild + trainer replacement + KO + Board return: ok");
