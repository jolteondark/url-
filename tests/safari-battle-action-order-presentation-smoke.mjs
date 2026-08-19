import assert from "node:assert/strict";

globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};
globalThis.window = { dispatchEvent() { return true; } };

const web = await import("../runtime/safari-web-playable-integration.js");

const TACKLE = "TACKLE";
assert.ok(web.SAFARI_MOVE_PRESENTATION[TACKLE], "TACKLE presentation/master projection is required for deterministic action-order coverage");

function moveRuntime() {
  return { id: TACKLE, pp: 35, ppup: 0 };
}

function activePlayer(runtime) {
  const battle = runtime.variables.mapless.battle;
  return runtime.player.party[Number(battle.player_party_index ?? 0)];
}

function syncTrainerActive(battle) {
  if (battle.kind !== "trainer") return;
  battle.trainer_party[Number(battle.trainer_party_index ?? 0)] = structuredClone(battle.foe);
}

async function start(kind = "wild") {
  const runtime = web.createSafariPlayableRuntime();
  const state = runtime.variables.mapless;
  state.board_events[0] = kind === "trainer"
    ? { kind: "trainer", trainer_seed: 271828, slot: 0 }
    : { kind: "wild", type: "BUG", slot: 0 };
  state.board_revealed[0] = true;
  state.board_consumed[0] = false;
  state.board_visited[0] = false;
  state.location = "day_board";
  const started = await web.activateSafariDayBoardCell(runtime, 0);
  assert.equal(started.result, "dispatched");
  assert.ok(state.battle && !state.battle.completed);
  const battle = state.battle;
  const player = activePlayer(runtime);
  player.moves = [moveRuntime()];
  battle.foe.moves = [moveRuntime()];
  syncTrainerActive(battle);
  return { runtime, state, battle, player };
}

function setStats(pokemon, { hp, speed, attack, defense }) {
  pokemon.max_hp = hp;
  pokemon.hp = hp;
  pokemon.stats.ATTACK = attack;
  pokemon.stats.SPECIAL_ATTACK = attack;
  pokemon.stats.DEFENSE = defense;
  pokemon.stats.SPECIAL_DEFENSE = defense;
  pokemon.stats.SPEED = speed;
}

function startedActors(result) {
  return (result.presentation ?? [])
    .filter((event) => event.type === "move_started")
    .map((event) => event.actor);
}

// Faster player one-shots: the mechanics owner truncates the round immediately.
// UI/presentation must never invent the queued foe action after KO.
{
  const { runtime, battle, player } = await start("wild");
  setStats(player, { hp: 200, speed: 9999, attack: 99999, defense: 99999 });
  setStats(battle.foe, { hp: 1, speed: 1, attack: 1, defense: 1 });
  const result = await web.resolveSafariBattleRound(runtime, TACKLE);
  assert.deepEqual(startedActors(result), ["player"], "player one-shot must have no foe action narration");
  assert.ok(result.presentation.some((event) => event.type === "faint" && event.target === "foe"));
  assert.equal(result.presentation.some((event) => event.type === "damage_applied" && event.target === "player"), false,
    "player one-shot must not display foe damage after the KO");
}

// Faster foe one-shots: proves Safari follows owner priority/speed order and is
// not player-first by presentation convention.
{
  const { runtime, battle, player } = await start("wild");
  setStats(player, { hp: 1, speed: 1, attack: 99999, defense: 1 });
  setStats(battle.foe, { hp: 200, speed: 9999, attack: 99999, defense: 99999 });
  const result = await web.resolveSafariBattleRound(runtime, TACKLE);
  assert.deepEqual(startedActors(result), ["foe"], "foe one-shot must have no player action narration");
  assert.ok(result.presentation.some((event) => event.type === "faint" && event.target === "player"));
  assert.equal(result.presentation.some((event) => event.type === "damage_applied" && event.target === "foe"), false,
    "foe one-shot must not display player damage after the KO");
}

// Nonlethal round: both owner-scheduled actions are presented, in owner order.
{
  const { runtime, battle, player } = await start("wild");
  setStats(player, { hp: 999, speed: 9999, attack: 1, defense: 99999 });
  setStats(battle.foe, { hp: 999, speed: 1, attack: 1, defense: 99999 });
  const result = await web.resolveSafariBattleRound(runtime, TACKLE);
  assert.deepEqual(startedActors(result), ["player", "foe"], "nonlethal round must narrate both scheduled actions only");
  assert.equal(result.presentation.filter((event) => event.type === "move_started").length, 2);
}

// Trainer reserve is committed by the trainer continuation owner after the KO,
// but must not attack in the same round. Presentation finishes faint -> send-out
// and the next command remains a fresh round.
{
  const { runtime, battle, player } = await start("trainer");
  assert.ok(Array.isArray(battle.trainer_party) && battle.trainer_party.length >= 2,
    "trainer action-order fixture requires an owner-generated reserve");
  setStats(player, { hp: 999, speed: 9999, attack: 99999, defense: 99999 });
  setStats(battle.foe, { hp: 1, speed: 1, attack: 1, defense: 1 });
  syncTrainerActive(battle);
  const result = await web.resolveSafariBattleRound(runtime, TACKLE);
  assert.deepEqual(startedActors(result), ["player"], "defeated trainer active must not act after being one-shot");
  const faintIndex = result.presentation.findIndex((event) => event.type === "faint" && event.target === "foe");
  const sendOutIndex = result.presentation.findIndex((event) => event.type === "trainer_next");
  assert.ok(faintIndex >= 0 && sendOutIndex > faintIndex, "trainer reserve presentation must follow faint before send-out");
  assert.equal(result.presentation.slice(sendOutIndex + 1).some((event) => event.type === "move_started" && event.actor === "foe"), false,
    "new trainer reserve must not attack in the replacement round");
  assert.equal(battle.completed, false);
  assert.equal(battle.player_replacement_required, false);
  assert.ok(Number(battle.foe.hp) > 0, "trainer continuation owner must leave the sent-out reserve active for the next command");
}

console.log("Safari Battle presentation contract: owner action order, KO truncation, nonlethal dual action, trainer send-out wait: ok");
await import("./safari-ko-post-action-acceptance-smoke.mjs");
