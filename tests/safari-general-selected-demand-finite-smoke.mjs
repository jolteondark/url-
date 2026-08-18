import assert from "node:assert/strict";

// Keep the GENERAL projection cold exactly as an iPhone/browser session does.
globalThis.window = {};

const {
  activateSafariDayBoardCell,
  createSafariPlayableRuntime,
} = await import("../runtime/safari-web-playable-integration.js");
const {
  safariGeneralCombatReady,
} = await import("../runtime/safari-general-data-demand.js");

function moveId(move) {
  return typeof move === "string" ? move : move?.id;
}

function expectedSelectedMasters(battles) {
  const species = new Set();
  const moves = new Set();
  for (const battle of battles) {
    if (!battle) continue;
    const party = battle.kind === "trainer" ? battle.trainer_party : [battle.foe];
    for (const pokemon of party ?? []) {
      if (pokemon?.species) species.add(pokemon.species);
      for (const move of pokemon?.moves ?? []) {
        const id = moveId(move);
        if (id) moves.add(id);
      }
    }
  }
  return { species: species.size, moves: moves.size };
}

assert.equal(safariGeneralCombatReady("wild"), false);
assert.equal(safariGeneralCombatReady("trainer"), false);

const runtime = createSafariPlayableRuntime();
const state = runtime.variables.mapless;
state.board_events[0] = { kind: "wild", type: "ELECTRIC", slot: 0 };
state.board_consumed[0] = false;
state.board_revealed[0] = true;
state.board_visited[0] = false;

await activateSafariDayBoardCell(runtime, 0);
const wildBattle = structuredClone(state.battle);
assert.equal(wildBattle.kind, "wild");
assert.equal(safariGeneralCombatReady("wild"), true);
assert.equal(safariGeneralCombatReady("trainer"), false,
  "selected wild demand must not import the trainer generator");

const {
  safariGeneralMaterializedMasterCounts,
} = await import("../runtime/safari-general-encounter-data-loader.js");

const wildExpected = expectedSelectedMasters([wildBattle]);
assert.deepEqual(safariGeneralMaterializedMasterCounts(), wildExpected,
  "cold wild start must materialize only its selected species and reset moves");
assert.ok(wildExpected.species === 1 && wildExpected.moves > 0 && wildExpected.moves <= 4,
  "wild selected-demand must stay finite at one species and at most four moves");

// Start a trainer from the same browser session. The loader/cache stays warm,
// so the exact count after this start must be only the union of masters needed
// by the already-selected wild foe and the selected trainer Party.
state.battle = null;
state.board_events[1] = { kind: "trainer", trainer_seed: 12345, slot: 1 };
state.board_consumed[1] = false;
state.board_revealed[1] = true;
state.board_visited[1] = false;

await activateSafariDayBoardCell(runtime, 1);
const trainerBattle = structuredClone(state.battle);
assert.equal(trainerBattle.kind, "trainer");
assert.equal(safariGeneralCombatReady("trainer"), true);
assert.ok(Array.isArray(trainerBattle.trainer_party) && trainerBattle.trainer_party.length >= 1);

const combinedExpected = expectedSelectedMasters([wildBattle, trainerBattle]);
assert.deepEqual(safariGeneralMaterializedMasterCounts(), combinedExpected,
  "warm trainer start must materialize only the union of selected Party species/moves");
assert.ok(combinedExpected.species <= 1 + trainerBattle.trainer_party.length,
  "trainer selected-demand must remain bounded by the selected Party size");
assert.ok(combinedExpected.moves <= 4 * combinedExpected.species,
  "selected move materialization must remain bounded by four reset moves per selected Pokemon");
assert.equal(globalThis.__maplessLastError, null,
  "successful selected-demand starts must not leave a stale runtime error");

console.log("Safari GENERAL selected-demand materializes only finite selected species/moves: ok");
