import assert from "node:assert/strict";
import fs from "node:fs";

// Keep GENERAL cold during module import. This mirrors an iPhone session whose
// first combat cell is a trainer rather than benefiting from any prior wild load.
globalThis.window = {};

const combatStartSource = fs.readFileSync(new URL("../runtime/safari-web-combat-start.js", import.meta.url), "utf8");
assert.equal((combatStartSource.match(/\.map\(materializePokemon\)/g) ?? []).length, 1,
  "selected trainer Party must be materialized exactly once before Battle state install");
assert.match(combatStartSource, /trainer_party:\s*trainerParty/,
  "Battle state must reuse the already materialized selected trainer Party");

const {
  activateSafariDayBoardCell,
  createSafariPlayableRuntime,
  resolveSafariBattleRound,
} = await import("../runtime/safari-web-playable-integration.js");
const {
  safariGeneralCombatReady,
} = await import("../runtime/safari-general-data-demand.js");

function moveId(move) {
  return typeof move === "string" ? move : move?.id;
}

assert.equal(safariGeneralCombatReady("trainer"), false,
  "cold browser-like startup must begin without the trainer generator");
assert.equal(safariGeneralCombatReady("wild"), false,
  "cold trainer startup must not inherit a prior wild owner load");

const runtime = createSafariPlayableRuntime();
const state = runtime.variables.mapless;
state.board_events[0] = { kind: "trainer", trainer_seed: 12345, slot: 0 };
state.board_consumed[0] = false;
state.board_revealed[0] = true;
state.board_visited[0] = false;

const start = await activateSafariDayBoardCell(runtime, 0);
assert.equal(start.result, "dispatched");
assert.equal(safariGeneralCombatReady("trainer"), true,
  "the combat owner must load the exact trainer dependency from a cold browser-like state");
assert.equal(safariGeneralCombatReady("wild"), false,
  "trainer-first combat must not require the wild encounter runtime");
assert.ok(state.battle, "cold trainer board activation must create Battle state");
assert.equal(state.battle.kind, "trainer");
assert.equal(state.battle.completed, false);
assert.ok(state.battle.trainer, "cold trainer Battle must materialize the trainer owner");
assert.ok(Array.isArray(state.battle.trainer_party) && state.battle.trainer_party.length > 0,
  "cold trainer Battle must materialize the trainer Party");
assert.ok(state.battle.foe?.species, "cold trainer Battle must materialize an active foe");
assert.ok(Array.isArray(state.battle.foe?.moves) && state.battle.foe.moves.length > 0,
  "cold trainer Battle must expose canonical foe moves");
assert.equal(globalThis.__maplessLastError, null,
  "a successful cold trainer Battle start must clear stale startup errors");

// Prove the freshly materialized Battle object is immediately usable by the
// same public round owner instead of only checking object creation.
const player = runtime.player.party[0];
const foe = state.battle.foe;
player.max_hp = 999;
player.hp = 999;
player.stats.ATTACK = 1;
player.stats.SPECIAL_ATTACK = 1;
player.stats.DEFENSE = 999;
player.stats.SPECIAL_DEFENSE = 999;
foe.max_hp = 999;
foe.hp = 999;
foe.stats.ATTACK = 1;
foe.stats.SPECIAL_ATTACK = 1;
foe.stats.DEFENSE = 999;
foe.stats.SPECIAL_DEFENSE = 999;
state.battle.trainer_party[state.battle.trainer_party_index] = structuredClone(foe);

const selectedMoveId = moveId(player.moves[0]);
assert.ok(selectedMoveId, "cold trainer Battle must expose a selectable player move");
const firstRound = await resolveSafariBattleRound(runtime, selectedMoveId);
assert.equal(firstRound.decision, 0, "cold trainer first durable round must remain nonterminal");
assert.equal(state.battle.turn, 2, "cold trainer Battle must advance through the public round owner");
assert.ok(Number(runtime.player.party[0].hp) > 0, "cold trainer first round must retain live player HP");
assert.ok(Number(state.battle.foe.hp) > 0, "cold trainer first round must retain live foe HP");

console.log("Safari cold trainer board -> single selected Party materialization -> Battle owner -> first round smoke passed");