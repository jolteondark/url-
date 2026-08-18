import assert from "node:assert/strict";
import fs from "node:fs";

// Keep GENERAL cold until the first interaction. This process starts with trainer combat.
globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};
globalThis.window = { dispatchEvent() { return true; } };

const combatStartSource = fs.readFileSync(new URL("../runtime/safari-web-combat-start.js", import.meta.url), "utf8");
const roundSource = fs.readFileSync(new URL("../runtime/safari-normal-battle-round.js", import.meta.url), "utf8");
assert.equal((combatStartSource.match(/\.map\(materializePokemon\)/g) ?? []).length, 1,
  "cold selected trainer Party must be materialized exactly once");
assert.match(combatStartSource, /trainer_party:\s*trainerParty/,
  "Battle state must reuse the already materialized trainer Party");
assert.doesNotMatch(roundSource, /playerRandomRoll\s*:\s*0/,
  "direct normal trainer rounds must leave player accuracy to seeded Battle Core");
assert.doesNotMatch(roundSource, /foeRandomRoll\s*:\s*0/,
  "direct normal trainer rounds must leave foe accuracy to seeded Battle Core");

const web = await import("../runtime/safari-web-playable-integration.js");
const runtime = web.createSafariPlayableRuntime();
const state = runtime.variables.mapless;
state.board_events[0] = { kind: "trainer", trainer_seed: 12345, slot: 0 };
state.board_revealed[0] = true;
state.board_consumed[0] = false;
state.board_visited[0] = false;
state.battle = null;
state.location = "day_board";

const started = await web.activateSafariDayBoardCell(runtime, 0);
assert.equal(started.result, "dispatched", "cold trainer Board cell must dispatch");
assert.ok(state.battle && !state.battle.completed, "cold trainer Battle must start");
assert.ok(Array.isArray(state.battle.trainer_party) && state.battle.trainer_party.length > 0,
  "cold trainer Battle must retain the materialized Party");

const battle = state.battle;
const playerIndex = Number(battle.player_party_index ?? 0);
const player = runtime.player.party[playerIndex];
const moveId = (move) => typeof move === "string" ? move : move?.id;
const selectedMoveId = moveId(player.moves[0]);
assert.ok(selectedMoveId, "cold trainer Battle must expose a player move");

// Force a deterministic two-opponent replacement shape after real cold materialization.
player.max_hp = Math.max(500, Number(player.max_hp ?? 1));
player.hp = player.max_hp;
player.stats.ATTACK = 999;
player.stats.SPECIAL_ATTACK = 999;
player.stats.DEFENSE = 999;
player.stats.SPECIAL_DEFENSE = 999;
player.stats.SPEED = 999;

const firstFoe = structuredClone(battle.foe);
const secondFoe = structuredClone(battle.trainer_party[1] ?? battle.foe);
firstFoe.hp = 1;
firstFoe.fainted = false;
secondFoe.hp = 1;
secondFoe.fainted = false;
// Make the replacement visibly different for presentation regression. Mechanics
// still use the already materialized runtime Pokemon; only max HP differs here.
secondFoe.max_hp = Math.max(Number(firstFoe.max_hp ?? 1) + 37, Number(secondFoe.max_hp ?? 1));
firstFoe.stats.ATTACK = 1;
firstFoe.stats.SPECIAL_ATTACK = 1;
secondFoe.stats.ATTACK = 1;
secondFoe.stats.SPECIAL_ATTACK = 1;
battle.trainer_party = [firstFoe, secondFoe];
battle.trainer_party_index = 0;
battle.trainer_party_order = [0, 1];
battle.foe = structuredClone(firstFoe);

const firstFoeSpecies = firstFoe.species;
const firstFoeMaxHp = Number(firstFoe.max_hp);
const hpBefore = Number(player.hp);
const first = await web.resolveSafariBattleRound(runtime, selectedMoveId);
assert.equal(first.decision, 0, "first trainer KO with reserve must remain nonterminal");
assert.equal(state.battle.completed, false, "reserve replacement must keep Battle active");
assert.equal(state.board_consumed[0], false, "intermediate KO must not consume Board cell");
assert.equal(Number(state.battle.trainer_party_index), 1, "first KO must activate reserve trainer Pokemon");
assert.ok(Number(state.battle.foe.hp) > 0, "replacement foe must be active");
assert.ok(Number(runtime.player.party[playerIndex].hp) > 0 && Number(runtime.player.party[playerIndex].hp) <= hpBefore,
  "player HP must persist through trainer replacement");

const firstFoeDamage = first.presentation.find((event) => event.type === "damage_applied" && event.target === "foe");
assert.ok(firstFoeDamage, "first trainer KO must expose foe damage presentation");
assert.equal(firstFoeDamage.targetSpecies, firstFoeSpecies,
  "damage presentation must keep the defeated foe identity even after reserve is already active");
assert.equal(Number(firstFoeDamage.targetMaxHp), firstFoeMaxHp,
  "damage presentation must keep the defeated foe max HP instead of the replacement max HP");
const firstFoeFaint = first.presentation.find((event) => event.type === "faint" && event.target === "foe");
assert.equal(firstFoeFaint?.targetSpecies, firstFoeSpecies,
  "faint presentation must name the defeated foe, not the already-committed replacement");
const trainerNext = first.presentation.find((event) => event.type === "trainer_next");
assert.equal(trainerNext?.species, state.battle.foe.species,
  "trainer_next remains the explicit transition to the newly active foe");

state.battle.foe.hp = 1;
state.battle.trainer_party[1].hp = 1;
const final = await web.resolveSafariBattleRound(runtime, selectedMoveId);
assert.equal(final.decision, 1, "final trainer KO must resolve victory");
assert.equal(state.battle.completed, true, "final KO must complete Battle");
assert.equal(state.board_consumed[0], true, "final victory must consume Board cell");
assert.ok(Number(state.battle.trainer_exp_gained ?? 0) + Number(state.battle.exp_gained ?? 0) > 0,
  "trainer multi-KO victory must retain EXP");

const returned = await web.returnSafariToDayBoard(runtime);
assert.equal(returned.result, "returned", "completed cold trainer Battle must return through public facade");
assert.equal(state.battle, null, "Board return must clear Battle state");
assert.equal(state.location, "day_board", "Board return must land on Day Board");

console.log("Safari cold trainer -> pre-replacement presentation identity -> reserve -> final victory -> Board return: ok");
