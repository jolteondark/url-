import assert from "node:assert/strict";
import {
  projectBrowserWildBattleAvailability,
  resolveBrowserWildBattleCommand,
} from "../runtime/browser-battle-wild-command-handoff.js";

const player = {
  hp: 40,
  max_hp: 50,
  status: "POISON",
  status_count: 2,
  item: "ORANBERRY",
  exp: 120,
  level: 11,
  moves: [{ id: "TACKLE", pp: 7, total_pp: 35 }],
  stats: { SPEED: 50 },
};
const foe = { hp: 10, max_hp: 40, status: "SLEEP", stats: { SPEED: 100 } };
const postBattlePersistenceInput = {
  party: [{ ...player, hp: 50, status: "NONE", status_count: 0, exp: 100, level: 10, moves: [{ id: "TACKLE", pp: 35, total_pp: 35 }] }],
  caught: [],
  initialItems: [["ORANBERRY"], []],
};

assert.deepEqual(projectBrowserWildBattleAvailability({ player, foe, runInput: { canRun: true } }), {
  canFight: true,
  canRun: true,
  canCapture: true,
});

const run = resolveBrowserWildBattleCommand({
  command: "run",
  player,
  foe,
  runInput: { canRun: true, runCommand: 0, randomRoll: 37 },
  postBattlePersistenceInput,
});
assert.equal(run.run.rate, 94);
assert.equal(run.decision, 3);
assert.equal(run.battleEnded, true);
assert.equal(run.terminalStateHandoff.resultKind, "fled");
assert.equal(run.terminalStateHandoff.postBattlePersistenceApplied, true);
assert.equal(run.terminalStateHandoff.playerParty[0].hp, 40);
assert.equal(run.terminalStateHandoff.playerParty[0].moves[0].pp, 7);
assert.equal(run.terminalStateHandoff.playerParty[0].exp, 120);
assert.equal(run.terminalStateHandoff.playerParty[0].level, 11);
assert.equal(run.terminalStateHandoff.playerParty[0].status, "POISON");
assert.equal(run.terminalStateHandoff.playerParty[0].item, "ORANBERRY");

const capture = resolveBrowserWildBattleCommand({
  command: "capture",
  player,
  foe,
  captureInput: {
    ball: "POKEBALL",
    allFaintedAfterCapture: true,
    capture: { catchRate: 255, unconditional: true, randomValues: [] },
  },
  postBattlePersistenceInput,
});
assert.equal(capture.capture.result, "caught");
assert.equal(capture.decision, 4);
assert.equal(capture.battleEnded, true);
assert.equal(capture.terminalStateHandoff.resultKind, "captured");
assert.equal(capture.terminalStateHandoff.postBattlePersistenceApplied, true);
assert.equal(capture.terminalStateHandoff.playerParty[0].hp, 40);
assert.equal(capture.terminalStateHandoff.playerParty[0].moves[0].pp, 7);
assert.ok(capture.operations.some((operation) => operation.op === "queue_caught_pokemon"));

const failedCapture = resolveBrowserWildBattleCommand({
  command: "capture",
  player,
  foe,
  captureInput: {
    ball: "POKEBALL",
    allFaintedAfterCapture: true,
    capture: { catchRate: 1, randomValues: [65535] },
  },
  postBattlePersistenceInput,
});
assert.equal(failedCapture.decision, 0);
assert.equal(failedCapture.battleEnded, false);
assert.equal(failedCapture.terminalStateHandoff.postBattlePersistenceApplied, false);
assert.equal(failedCapture.terminalStateHandoff.playerParty[0].hp, 50);

console.log(JSON.stringify({
  ok: true,
  runDecision: run.decision,
  captureDecision: capture.decision,
  runHp: run.terminalStateHandoff.playerParty[0].hp,
  captureHp: capture.terminalStateHandoff.playerParty[0].hp,
  failedCaptureTerminal: failedCapture.terminalStateHandoff.terminal,
}));
