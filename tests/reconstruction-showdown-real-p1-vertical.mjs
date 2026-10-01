import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { inspectExtractedShowdownArtifact } from '../scripts/showdown-browser-artifact-contract.mjs';
import { loadShowdownBrowserArtifact, REQUIRED_SHOWDOWN_REVISION } from '../src-next/core/battle/showdown-browser-artifact.js';
import { createShowdownStreamSession } from '../src-next/core/battle/showdown-stream-session.js';
import { commitShowdownStreamTerminal } from '../src-next/core/battle/showdown-terminal-handoff.js';
import { createShowdownBattleSnapshot, projectMaplessPartyToShowdown } from '../src-next/core/battle/showdown-roundtrip.js';
import { calculateMaplessBattleExp } from '../src-next/core/growth/mapless-experience.js';
import { drawShowdownBattleSeed, drawWildShowdownMove } from '../src-next/core/battle/battle-rng.js';
import { createFreshRunState } from '../src-next/core/run/fresh-start.js';
import { serializeNewCoreSave, restoreNewCoreSave } from '../src-next/core/persistence.js';
import { step } from '../src-next/core/step.js';
import { prepareNewCoreWildBoardSlot } from '../src-next/platform/p1-wild-encounter-driver.js';

const extractorDir = process.argv[2];
if (!extractorDir) {
  console.error('usage: node tests/reconstruction-showdown-real-p1-vertical.mjs <built-pinned-pkmn-ps-checkout>');
  process.exit(2);
}

const artifact = inspectExtractedShowdownArtifact(resolve(extractorDir));
assert.equal(artifact.showdownRevision, REQUIRED_SHOWDOWN_REVISION);
const showdown = await loadShowdownBrowserArtifact(artifact);
assert.equal(showdown.revision, REQUIRED_SHOWDOWN_REVISION);

let state = createFreshRunState({ runId: 'real-showdown-p1-vertical', seed: 108 });
assert.equal(state.money, 1000);
assert.equal(state.party[0].species, 'Eevee');
assert.equal(state.party[0].level, 9);
assert.equal(state.party[0].maxhp, 28);

state = step(state, { type: 'GENERATE_DAY_BOARD' }).state;
const wildSlot = state.board.findIndex((slot) => slot.kind === 'wild');
assert.equal(wildSlot, 2, 'seed 108 first canonical Board wild slot');
assert.equal(state.board[wildSlot].type, 'BUG');

const prepared = await prepareNewCoreWildBoardSlot(state, wildSlot);
state = prepared.state;
const encounter = state.board[wildSlot].encounter;
assert.equal(encounter.type, 'BUG');
assert.ok(encounter.species);
assert.ok(Number.isInteger(encounter.level) && encounter.level >= 1);
assert.ok(Number.isInteger(encounter.baseExp) && encounter.baseExp >= 0);
assert.ok(encounter.pokemon?.moves?.length > 0);
assert.equal(encounter.pokemon.hp, encounter.pokemon.maxhp);
assert.deepEqual(encounter.pokemon.iv, { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 });
assert.deepEqual(encounter.pokemon.ev, { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 });

state = step(state, { type: 'BOARD_SELECT', slot: wildSlot }).state;
const battleId = state.activeBattle.id;
assert.equal(state.mode, 'battle_pending');

const playerTeam = createShowdownBattleSnapshot({ party: state.party }, { battleId }).party;
const wildTeam = projectMaplessPartyToShowdown([encounter.pokemon]);
const battleSeed = drawShowdownBattleSeed(state.rngState);
state = step(state, {
  type: 'BATTLE_RNG_ADVANCED',
  battleId,
  rngStateBefore: state.rngState,
  nextRngState: battleSeed.nextRngState,
}).state;
const session = createShowdownStreamSession(showdown, {
  formatid: 'gen9customgame',
  seed: battleSeed.seed,
  p1: { name: 'Mapless', team: playerTeam },
  p2: { name: 'Wild', team: wildTeam },
});

await session.start();
assert.equal(session.battleStream.battle.sides[0].pokemon[0].maxhp, 28, 'canonical Fresh Start Eevee must preserve Mapless max HP in real Showdown');
assert.equal(session.battleStream.battle.sides[1].pokemon[0].maxhp, encounter.pokemon.maxhp, 'generated wild max HP must match real Showdown');

let resolved = session.resolvedState();
let turns = 0;
while (!resolved.terminal && turns < 20) {
  const ai = drawWildShowdownMove(state.rngState, resolved.p2[0].moves);
  state = step(state, {
    type: 'BATTLE_RNG_ADVANCED',
    battleId,
    rngStateBefore: state.rngState,
    nextRngState: ai.nextRngState,
  }).state;
  await Promise.all([session.fight('p1', 1), session.fight('p2', ai.moveSlot)]);
  turns += 1;
  resolved = session.resolvedState();
}
const terminal = resolved;
assert.equal(terminal.terminal, true, 'canonical Fresh Start wild battle must reach a terminal within 20 turns');
assert.equal(terminal.winner, 'Mapless', 'Fresh Start Eevee must defeat the seeded Day 1 wild fixture');
assert.equal(terminal.p2[0].fainted, true);
assert.ok(terminal.p1[0].moves[0].pp < 35, 'real Showdown must consume Tackle PP');
assert.ok(terminal.p1[0].hp > 0, 'winner must remain able to return to the Board');

const partyCommit = commitShowdownStreamTerminal(state, { battleId, session });
assert.equal(partyCommit.committed, true);
assert.equal(partyCommit.duplicate, false);
assert.equal(partyCommit.state.party[0].hp, terminal.p1[0].hp);
assert.equal(partyCommit.state.party[0].moves[0].pp, terminal.p1[0].moves[0].pp);
assert.equal(partyCommit.state.party[0].exp, 990, 'battle persistence must not invent growth rewards');

const terminalResultId = `showdown-terminal:${battleId}`;
const terminalCommit = step(partyCommit.state, {
  type: 'BATTLE_TERMINAL_RESULT',
  battleId,
  resultId: terminalResultId,
  outcome: 'win',
});
assert.equal(terminalCommit.state.mode, 'battle_result');
assert.equal(terminalCommit.state.board[wildSlot].consumed, true);
assert.equal(terminalCommit.state.boardSelectionsRemaining, 7);
assert.equal(terminalCommit.events.some((event) => event.type === 'BATTLE_WON'), true);
assert.equal(terminalCommit.events.at(-1).type, 'BATTLE_REWARD_REQUESTED');
assert.equal(terminalCommit.effects.length, 0);

const expectedExpGain = calculateMaplessBattleExp({
  defeatedLevel: encounter.level,
  baseExp: encounter.baseExp,
  gainerLevel: 9,
  moreExpFromTrainerPokemon: false,
  trainerBattle: false,
  scaledExpFormula: false,
});
const rewardId = terminalCommit.state.pendingBattleResult.rewardId;
const rewarded = step(terminalCommit.state, {
  type: 'BATTLE_REWARD_RESULT',
  rewardId,
  recipientIds: ['1'],
});
assert.equal(rewarded.state.mode, 'board');
assert.equal(rewarded.state.money, 1000, 'ordinary wild victory must not grant trainer prize money');
assert.equal(rewarded.state.party[0].exp, 990 + expectedExpGain);
assert.equal(rewarded.state.bag.items.POTION, 1, 'ordinary wild victory must grant the canonical Potion');
assert.equal(rewarded.state.party[0].moves[0].pp, terminal.p1[0].moves[0].pp, 'reward must not overwrite Showdown-committed PP');
assert.equal(rewarded.events.some((event) => event.type === 'EXP_GAINED' && event.amount === expectedExpGain), true);
assert.equal(rewarded.events.some((event) => event.type === 'ITEM_REWARDED' && event.itemId === 'POTION'), true);
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
  recipientIds: ['1'],
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
assert.deepEqual(advanced.effects, []);

const day2Generated = step(advanced.state, { type: 'GENERATE_DAY_BOARD' });
assert.deepEqual(day2Generated.effects, [{ type: 'REQUEST_SAVE', reason: 'day_advanced' }]);
const day2 = day2Generated.state;
const restored = restoreNewCoreSave(serializeNewCoreSave(day2));
assert.deepEqual(restored, day2, 'fresh Continue must restore the exact canonical P1 state');
assert.equal(restored.day, 2);
assert.equal(restored.money, 1000);
assert.equal(restored.party[0].exp, 990 + expectedExpGain);
assert.equal(restored.bag.items.POTION, 1);
assert.equal(restored.party[0].moves[0].pp, terminal.p1[0].moves[0].pp);
assert.deepEqual(restored.diagnostics.appliedBattleStateResultIds, [terminalResultId]);
assert.deepEqual(restored.diagnostics.appliedResultIds, [terminalResultId]);
assert.deepEqual(restored.diagnostics.appliedRewardIds, [rewardId]);
assert.deepEqual(restored.diagnostics.appliedDayTransitionIds, ['real-showdown-p1:day-1-next']);

console.log(JSON.stringify({
  ok: true,
  showdownRevision: showdown.revision,
  battleId,
  wild: { species: encounter.species, level: encounter.level, baseExp: encounter.baseExp },
  showdownSeed: battleSeed.seed,
  turns,
  terminalResultId,
  rewardId,
  expectedExpGain,
  day: restored.day,
  money: restored.money,
  potion: restored.bag.items.POTION,
  starterExp: restored.party[0].exp,
  starterHp: restored.party[0].hp,
  starterPp: restored.party[0].moves[0].pp,
  rewardReplayRejected: rewardReplay.events[0].type === 'BATTLE_REWARD_REPLAY_IGNORED',
}, null, 2));
