import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { inspectExtractedShowdownArtifact } from '../scripts/showdown-browser-artifact-contract.mjs';
import { loadShowdownBrowserArtifact, REQUIRED_SHOWDOWN_REVISION } from '../src-next/core/battle/showdown-browser-artifact.js';
import { createShowdownStreamSession } from '../src-next/core/battle/showdown-stream-session.js';
import { commitShowdownStreamTerminal } from '../src-next/core/battle/showdown-terminal-handoff.js';
import { createShowdownBattleSnapshot, projectMaplessPartyToShowdown } from '../src-next/core/battle/showdown-roundtrip.js';
import { createInitialGameState } from '../src-next/core/game-state.js';
import { serializeNewCoreSave, restoreNewCoreSave } from '../src-next/core/persistence.js';
import { step } from '../src-next/core/step.js';

const extractorDir = process.argv[2];
if (!extractorDir) {
  console.error('usage: node tests/reconstruction-showdown-real-p1-vertical.mjs <built-pinned-pkmn-ps-checkout>');
  process.exit(2);
}

const artifact = inspectExtractedShowdownArtifact(resolve(extractorDir));
assert.equal(artifact.showdownRevision, REQUIRED_SHOWDOWN_REVISION);
const showdown = await loadShowdownBrowserArtifact(artifact);
assert.equal(showdown.revision, REQUIRED_SHOWDOWN_REVISION);

const wildPersistentTeam = [{
  id: 'wild-magikarp', species: 'Magikarp', name: 'Magikarp', level: 50, ability: 'Swift Swim',
  hp: 95, maxhp: 95, status: '', heldItem: '', fainted: false,
  moves: [{ id: 'splash', pp: 40, maxpp: 40 }],
}];
const wildTeam = projectMaplessPartyToShowdown(wildPersistentTeam);
const boardSlots = Array.from({ length: 8 }, (_, index) => index === 2
  ? { kind: 'wild', encounter: { species: 'Magikarp', level: 50, baseExp: 40 } }
  : { kind: 'event', id: `event-${index}` });

let state = createInitialGameState({
  seed: 4242,
  runId: 'real-showdown-p1-vertical',
  money: 25,
  party: [{
    id: 'starter-pikachu', species: 'Pikachu', name: 'Pikachu', level: 50, ability: 'Static',
    hp: 60, maxhp: 110, status: 'brn', heldItem: 'throatspray', fainted: false, exp: 100,
    moves: [{ id: 'hypervoice', pp: 3, maxpp: 10 }],
  }, {
    id: 'bench-rotom-wash', species: 'Rotom-Wash', name: 'Washer', level: 37, ability: 'Levitate',
    hp: 61, maxhp: 95, status: '', heldItem: '', fainted: false, exp: 200,
    moves: [{ id: 'hydropump', pp: 2, maxpp: 5 }],
  }],
});

state = step(state, { type: 'BOARD_GENERATED', slots: boardSlots }).state;
state = step(state, { type: 'BOARD_SELECT', slot: 2 }).state;
const battleId = state.activeBattle.id;
assert.equal(state.mode, 'battle_pending');

const projectedParty = createShowdownBattleSnapshot({ party: state.party }, { battleId }).party;
const session = createShowdownStreamSession(showdown, {
  formatid: 'gen9customgame',
  seed: [1, 2, 3, 4],
  p1: { name: 'Mapless', team: projectedParty },
  p2: { name: 'Wild', team: wildTeam },
});

await session.start();
await Promise.all([session.fight('p1', 1), session.fight('p2', 1)]);
assert.equal(session.resolvedState().terminal, false, 'known fixture must survive the first real Showdown turn');
await Promise.all([session.fight('p1', 1), session.fight('p2', 1)]);
const terminal = session.resolvedState();
assert.equal(terminal.terminal, true, 'known fixture must terminate after two real Showdown turns');
assert.equal(terminal.winner, 'Mapless');
assert.equal(terminal.p2[0].fainted, true);
assert.equal(terminal.p1[0].moves[0].pp, 1);
assert.equal(terminal.p1[0].heldItem, '');

const partyCommit = commitShowdownStreamTerminal(state, { battleId, session });
assert.equal(partyCommit.committed, true);
assert.equal(partyCommit.duplicate, false);
assert.equal(partyCommit.state.party[0].moves[0].pp, 1);
assert.equal(partyCommit.state.party[0].heldItem, '');
assert.equal(partyCommit.state.party[0].exp, 100, 'battle persistence must not invent growth rewards');

const terminalResultId = `showdown-terminal:${battleId}`;
const terminalCommit = step(partyCommit.state, {
  type: 'BATTLE_TERMINAL_RESULT',
  battleId,
  resultId: terminalResultId,
  outcome: 'win',
});
assert.equal(terminalCommit.state.mode, 'battle_result');
assert.equal(terminalCommit.state.board[2].consumed, true);
assert.equal(terminalCommit.state.boardSelectionsRemaining, 7);
assert.equal(terminalCommit.events.at(-1).type, 'BATTLE_REWARD_REQUESTED');
assert.equal(terminalCommit.effects.length, 0);

const rewardId = terminalCommit.state.pendingBattleResult.rewardId;
const rewarded = step(terminalCommit.state, {
  type: 'BATTLE_REWARD_RESULT',
  rewardId,
  recipientIds: ['starter-pikachu'],
});
assert.equal(rewarded.state.mode, 'board');
assert.equal(rewarded.state.money, 25, 'ordinary wild victory must not grant trainer prize money');
assert.equal(rewarded.state.party[0].exp, 242, 'Mapless Lv50 vs Lv50 Magikarp base Exp 40 must award 142 EXP');
assert.equal(rewarded.state.party[1].exp, 200);
assert.equal(rewarded.state.bag.items.POTION, 1, 'ordinary wild victory must grant the canonical Potion');
assert.equal(rewarded.state.party[0].moves[0].pp, 1, 'reward must not overwrite Showdown-committed PP');
assert.equal(rewarded.events.at(-1).type, 'BOARD_RETURNED');
assert.deepEqual(rewarded.effects, [{ type: 'REQUEST_SAVE', reason: 'battle_reward_result' }]);

const battleReplay = commitShowdownStreamTerminal(rewarded.state, { battleId, session });
assert.equal(battleReplay.duplicate, true, 'Showdown terminal party state must not commit twice after reward');
assert.equal(battleReplay.state, rewarded.state);
const coreTerminalReplay = step(rewarded.state, {
  type: 'BATTLE_TERMINAL_RESULT',
  battleId,
  resultId: terminalResultId,
  outcome: 'win',
});
assert.equal(coreTerminalReplay.events[0].type, 'BATTLE_RESULT_REPLAY_IGNORED');
assert.deepEqual(coreTerminalReplay.state, rewarded.state);
const rewardReplay = step(rewarded.state, {
  type: 'BATTLE_REWARD_RESULT',
  rewardId,
  recipientIds: ['starter-pikachu'],
});
assert.equal(rewardReplay.events[0].type, 'BATTLE_REWARD_REPLAY_IGNORED');
assert.deepEqual(rewardReplay.state, rewarded.state);

const advanced = step(rewarded.state, {
  type: 'ADVANCE_DAY',
  transitionId: 'real-showdown-p1:day-1-next',
  confirmed: true,
});
assert.equal(advanced.state.day, 2);
assert.equal(advanced.state.mode, 'board_pending');
assert.equal(advanced.events.at(-1).type, 'BOARD_GENERATION_REQUESTED');
assert.deepEqual(advanced.effects, [{ type: 'REQUEST_SAVE', reason: 'day_advanced' }]);

const day2 = step(advanced.state, { type: 'BOARD_GENERATED', slots: boardSlots }).state;
const restored = restoreNewCoreSave(serializeNewCoreSave(day2));
assert.deepEqual(restored, day2, 'fresh Continue must restore the exact canonical P1 state');
assert.equal(restored.day, 2);
assert.equal(restored.money, 25);
assert.equal(restored.party[0].exp, 242);
assert.equal(restored.bag.items.POTION, 1);
assert.equal(restored.party[0].moves[0].pp, 1);
assert.equal(restored.party[0].heldItem, '');
assert.deepEqual(restored.diagnostics.appliedBattleStateResultIds, [terminalResultId]);
assert.deepEqual(restored.diagnostics.appliedResultIds, [terminalResultId]);
assert.deepEqual(restored.diagnostics.appliedRewardIds, [rewardId]);
assert.deepEqual(restored.diagnostics.appliedDayTransitionIds, ['real-showdown-p1:day-1-next']);

console.log(JSON.stringify({
  ok: true,
  showdownRevision: showdown.revision,
  battleId,
  terminalResultId,
  rewardId,
  day: restored.day,
  money: restored.money,
  potion: restored.bag.items.POTION,
  starterExp: restored.party[0].exp,
  starterPp: restored.party[0].moves[0].pp,
  rewardReplayRejected: rewardReplay.events[0].type === 'BATTLE_REWARD_REPLAY_IGNORED',
}, null, 2));
