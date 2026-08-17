import assert from "node:assert/strict";
import fs from "node:fs";
import {
  activateSafariDayBoardCell,
  createSafariPlayableRuntime,
  resolveSafariBattleRound,
} from "../runtime/safari-playable-integration.js";

function moveId(move) {
  return typeof move === "string" ? move : move?.id;
}

assert.equal(
  fs.existsSync(new URL("../runtime/safari-ko-presentation-safety.js", import.meta.url)),
  false,
  "KO presentation must be owned by the direct playable round, not a restored migration wrapper",
);
assert.equal(
  fs.existsSync(new URL("../runtime/browser-battle-round-hp-projection.js", import.meta.url)),
  false,
  "Battle Runtime must remain the single HP owner",
);

const runtime = createSafariPlayableRuntime();
const state = runtime.variables.mapless;
const wildIndex = state.board_events.findIndex((event) => event?.kind === "wild");
assert.notEqual(wildIndex, -1, "real playable runtime must contain a wild battle cell");
const start = activateSafariDayBoardCell(runtime, wildIndex);
assert.equal(start.boundary, "wild");
assert.equal(state.battle?.kind, "wild");

const player = runtime.player.party[0];
player.hp = Math.max(1, Number(player.max_hp ?? player.hp ?? 1));
player.stats.ATTACK = Math.max(999, Number(player.stats.ATTACK ?? 0));
player.stats.SPEED = Math.max(999, Number(player.stats.SPEED ?? 0));
const selectedMoveId = moveId(player.moves[0]);

state.battle.foe.hp = 1;
state.battle.foe.fainted = false;
const result = await Promise.resolve(resolveSafariBattleRound(runtime, selectedMoveId));

assert.equal(result.decision, 1, "terminal wild KO must still be a Battle-owned win");
assert.equal(state.battle.completed, true);
assert.equal(Number(state.battle.foe.hp), 0);
assert.equal(Number(result.foe?.hp), 0, "Battle Runtime HP must remain authoritative");
assert.equal(result.safariKoPresentationImmediate, true);
const presentationTypes = (result.presentation ?? []).map((event) => event.type);
assert.equal(presentationTypes.includes("move_started"), false);
assert.equal(presentationTypes.includes("damage_applied"), false);
assert.equal(presentationTypes.includes("faint"), true);
assert.equal(presentationTypes.includes("battle_result"), true);

console.log("Battle KO owner demolition smoke: ok");
