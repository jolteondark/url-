import assert from "node:assert/strict";
import fs from "node:fs";
import { attemptSafariFlee } from "../runtime/safari-flee-command.js";

globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};
globalThis.window = { dispatchEvent() { return true; } };

const web = await import("../runtime/safari-web-playable-integration.js");
const runtime = web.createSafariPlayableRuntime();
const state = runtime.variables.mapless;

state.board_events[0] = { kind: "wild", type: "BUG", slot: 0 };
state.board_revealed[0] = true;
state.board_consumed[0] = false;
state.board_visited[0] = false;
state.battle = null;
state.location = "day_board";
const started = await web.activateSafariDayBoardCell(runtime, 0);
assert.equal(started.result, "dispatched");
assert.ok(state.battle && state.battle.kind === "wild" && !state.battle.completed);

const active = runtime.player.party[Number(state.battle.player_party_index ?? 0)];
const movesBefore = structuredClone(active.moves);
const hpBefore = Number(active.hp);
const turnBefore = Number(state.battle.turn ?? 1);

const fled = attemptSafariFlee(runtime, { runRandomSeed: 1, randomRoll: 0 });
assert.equal(fled.escaped, true,
  "randomRoll 0 must satisfy any positive canonical escape rate in a normal wild Battle");
assert.equal(fled.decision, 3);
assert.equal(fled.turnConsumed, true);
assert.equal(fled.target, "day_board");
assert.equal(fled.persistenceRequested, true,
  "successful flee must request persistence before returning to the Board");
assert.equal(state.battle.completed, true,
  "successful flee must enter the existing terminal Battle phase before Board return");
assert.equal(Number(state.battle.decision), 3);
assert.equal(Number(state.battle.turn), turnBefore,
  "successful flee ends the Battle without fabricating a move round");
assert.equal(Number(active.hp), hpBefore,
  "successful flee must preserve active HP when no foe response occurs");
assert.deepEqual(active.moves, movesBefore,
  "successful flee must not consume player move PP");
assert.equal(Boolean(state.board_consumed[0]), true);
assert.equal(Boolean(state.board_visited[0]), true);
assert.equal(
  (fled.operations ?? []).filter((operation) => operation.op === "request_save").length,
  1,
  "successful flee must emit one save request from the existing owner");

const returned = await web.returnSafariToDayBoard(runtime);
assert.equal(returned.target, "day_board");
assert.equal(state.location, "day_board");
assert.equal(state.battle, null,
  "Board return must clear the terminal flee Battle owner");
assert.equal(Boolean(state.board_consumed[0]), true);
assert.equal(Boolean(state.board_visited[0]), true);

const fleeBridgeSource = fs.readFileSync(new URL("../battle-dppt-flee-owner-request.js", import.meta.url), "utf8");
assert.match(fleeBridgeSource, /data-dppt-command=\\?"flee\\?"/,
  "DPt RUN must be captured by the dedicated flee owner bridge");
assert.match(fleeBridgeSource, /attemptSafariFlee\(currentRuntime\)/,
  "DPt RUN bridge must call the existing canonical-derived flee owner");
assert.doesNotMatch(fleeBridgeSource, /byId\(\"flee\"\)\?\.click/,
  "DPt RUN must not relay through the legacy hidden flee button");

console.log("Safari RUN -> canonical flee -> terminal Battle -> Day Board return + DPt owner wiring: PASS");
