import assert from "node:assert/strict";
import fs from "node:fs";
import { SAFARI_BATTLE_PHASE } from "../runtime/safari-battle-orchestrator.js";
import { switchSafariNormalBattlePlayer } from "../runtime/safari-normal-battle-voluntary-switch.js";

globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};
globalThis.window = { dispatchEvent() { return true; } };

const web = await import("../runtime/safari-web-playable-integration.js");
const runtime = web.createSafariPlayableRuntime();
const state = runtime.variables.mapless;
const reserve = structuredClone(runtime.player.party[0]);
reserve.personal_id = Number(reserve.personal_id ?? 1) + 7000;
reserve.hp = reserve.max_hp;
reserve.moves = reserve.moves.map((move) => typeof move === "string" ? move : { ...move });
runtime.player.party.push(reserve);

state.board_events[0] = { kind: "wild", type: "BUG", slot: 0 };
state.board_revealed[0] = true;
state.board_consumed[0] = false;
state.board_visited[0] = false;
state.battle = null;
state.location = "day_board";
const started = await web.activateSafariDayBoardCell(runtime, 0);
assert.equal(started.result, "dispatched");
assert.equal(Number(state.battle.player_party_index ?? 0), 0);

for (const pokemon of runtime.player.party) {
  pokemon.max_hp = Math.max(500, Number(pokemon.max_hp ?? 1));
  pokemon.hp = pokemon.max_hp;
  pokemon.stats.DEFENSE = 999;
  pokemon.stats.SPECIAL_DEFENSE = 999;
}
state.battle.foe.stats.ATTACK = 1;
state.battle.foe.stats.SPECIAL_ATTACK = 1;
const activePpBefore = structuredClone(runtime.player.party[0].moves);
const reservePpBefore = structuredClone(runtime.player.party[1].moves);
const turnBefore = Number(state.battle.turn ?? 1);

const switched = switchSafariNormalBattlePlayer(runtime, 1);
assert.equal(switched.result, "switched");
assert.equal(switched.turnConsumed, true);
assert.equal(Number(state.battle.player_party_index), 1,
  "voluntary switch must commit the existing switch owner before the foe response");
assert.equal(Number(state.battle.turn), turnBefore + 1,
  "voluntary switch plus one foe response consumes exactly one Battle turn");
assert.ok((switched.switchResolution?.operations ?? []).some((operation) => operation.op === "send_out"),
  "voluntary switch must expose the existing Battle Systems send_out operation");
assert.equal(
  (switched.opponentResponse?.operations ?? []).filter((operation) => operation.op === "use_move" && operation.actor === "foe").length,
  1,
  "a living foe responds exactly once after a voluntary switch",
);
assert.deepEqual(runtime.player.party[0].moves, activePpBefore,
  "the switched-out player must not consume move PP");
assert.deepEqual(runtime.player.party[1].moves, reservePpBefore,
  "the switched-in player must not consume move PP for the switch command");
assert.deepEqual(
  state.battle.phase_trace.slice(-5).map((step) => step.phase),
  [SAFARI_BATTLE_PHASE.ACTION_1, SAFARI_BATTLE_PHASE.CHECK_1, SAFARI_BATTLE_PHASE.ACTION_2, SAFARI_BATTLE_PHASE.CHECK_2, SAFARI_BATTLE_PHASE.COMMAND],
  "switch is ACTION_1 and the living-foe response is ACTION_2 exactly once",
);

const rejectedTurnBefore = Number(state.battle.turn);
const rejected = switchSafariNormalBattlePlayer(runtime, 1);
assert.equal(rejected.result, "rejected");
assert.equal(rejected.turnConsumed, false,
  "selecting the already-active Pokemon must be rejected by the existing switch owner without consuming the command");
assert.equal(Number(state.battle.turn), rejectedTurnBefore);
assert.equal(rejected.opponentResponse, null);
assert.equal(state.battle.phase, SAFARI_BATTLE_PHASE.COMMAND);
assert.equal(state.battle.phase_trace.at(-1)?.phase, SAFARI_BATTLE_PHASE.COMMAND);
assert.match(state.battle.phase_trace.at(-1)?.reason ?? "", /command not consumed:switch/);

const bridgeSource = fs.readFileSync(new URL("../battle-party-voluntary-switch-bridge.js", import.meta.url), "utf8");
const deferredSource = fs.readFileSync(new URL("../deferred-ui-loader.js", import.meta.url), "utf8");
assert.match(bridgeSource, /from "\.\/runtime\/safari-normal-battle-voluntary-switch\.js"/,
  "Battle Party UI must call the existing voluntary-switch owner rather than forced replacement");
assert.match(bridgeSource, /switchSafariNormalBattlePlayer\(runtime\(\), partyIndex\)/,
  "Battle Party selection must hand the selected Party index to the existing switch owner");
assert.match(bridgeSource, /current\.phase === "COMMAND"/,
  "voluntary Party switching must only be exposed during COMMAND");
assert.match(bridgeSource, /current\.origin !== "boundary_trial"/,
  "normal voluntary-switch bridge must not claim boundary-trial ownership");
assert.match(bridgeSource, /Number\(pokemon\.hp \?\? 0\) <= 0/,
  "fainted Party members must remain unselectable");
assert.doesNotMatch(bridgeSource, /replaceSafariBattlePlayer/,
  "voluntary switching must never reuse the forced-faint replacement owner");
assert.match(deferredSource, /battle-party-voluntary-switch-bridge\.js\?v=/,
  "the deferred Party menu bundle must load the Battle voluntary-switch bridge");

console.log("Safari voluntary switch -> ACTION_1 -> one foe ACTION_2 / rejected switch -> COMMAND + Party UI wiring: PASS");
