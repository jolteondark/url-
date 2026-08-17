import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  activateSafariDayBoardCell,
  createSafariPlayableRuntime,
  resolveSafariBattleRound,
} from "../runtime/safari-web-playable-integration.js";
import { ensureSafariGeneralCombatData } from "../runtime/safari-general-data-demand.js";

const runtime = createSafariPlayableRuntime();
const state = runtime.variables.mapless;
state.board_events[0] = { kind: "wild", type: "ELECTRIC", slot: 0 };
state.board_consumed[0] = false;
state.board_revealed[0] = true;
state.board_visited[0] = false;

await ensureSafariGeneralCombatData("wild");
const start = await activateSafariDayBoardCell(runtime, 0);
assert.equal(start.result, "dispatched");
assert.ok(state.battle, "board combat click path must create Battle state");
assert.equal(state.battle.kind, "wild");
assert.equal(state.battle.completed, false);
assert.ok(state.battle.foe?.species, "Battle state must contain a materialized foe");
assert.ok(runtime.player.party[0].moves.some((move) => (typeof move === "string" ? move : move.id) === "TACKLE"));

let previousPlayerHp = runtime.player.party[0].hp;
let previousFoeHp = state.battle.foe.hp;
let turns = 0;
while (!state.battle.completed && turns < 12) {
  const result = await resolveSafariBattleRound(runtime, "TACKLE");
  assert.ok(Array.isArray(result.presentation));
  assert.ok(runtime.player.party[0].hp <= previousPlayerHp, "player HP must carry forward across rounds");
  assert.ok(state.battle.foe.hp <= previousFoeHp, "foe HP must carry forward across rounds");
  previousPlayerHp = runtime.player.party[0].hp;
  previousFoeHp = state.battle.foe.hp;
  turns += 1;
}
assert.ok(turns > 0, "at least one Battle round must execute from the board-started state");
assert.ok(state.battle.turn >= 1, "Battle turn state must remain owned by the Battle runtime");

const previewApp = await readFile(new URL("../preview-app.js", import.meta.url), "utf8");
assert.match(previewApp, /button\.dataset\.moveId = id/,
  "Battle render must project owner-backed moves into tappable move buttons");
assert.match(previewApp, /card\.hidden = !battle/,
  "Battle scene visibility must follow Battle state creation");
assert.match(previewApp, /returnSafariToDayBoard\(runtime\)/,
  "terminal Battle UI must retain the canonical return-to-board owner path");

const demandSource = await readFile(new URL("../runtime/safari-general-data-demand.js", import.meta.url), "utf8");
assert.match(demandSource, /const implicitKind = kind == null;/,
  "kind-less UI preflight must be distinguishable from explicit wild/trainer/both combat demand");
assert.match(demandSource, /if \(implicitKind\) \{[\s\S]*fullMastersInstalled: safariGeneralMastersInstalled\(\)/,
  "kind-less UI preflight must stop after canonical GENERAL masters instead of waiting for both combat modules");
assert.match(demandSource, /typeof window === "undefined"\) await ensureSafariGeneralCombatData\("both"\)/,
  "Node/focused consumers must retain the explicit both-module readiness contract");

const previewBoot = await readFile(new URL("../preview.js", import.meta.url), "utf8");
const activationIndex = previewBoot.indexOf("await activateInitialBoardChoice(boardIndex);");
const detachIndex = previewBoot.indexOf("detachBootListeners();", activationIndex);
assert.ok(activationIndex >= 0 && detachIndex > activationIndex,
  "boot listeners must stay attached until the initial Board choice has created its destination state");
assert.match(previewBoot, /const failedAction = selectedAction;\s*armBoard\(failedAction\);/,
  "failed async Battle startup must restore a tappable boot Day Board for retry");
assert.match(previewBoot, /マスを選び直せます/,
  "failed startup must tell the player that the Day Board can be retried");

console.log("Safari board -> Battle live-path smoke passed");
