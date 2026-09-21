import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { inspectExtractedShowdownArtifact } from '../scripts/showdown-browser-artifact-contract.mjs';
import { loadShowdownBrowserArtifact, REQUIRED_SHOWDOWN_REVISION } from '../src-next/core/battle/showdown-browser-artifact.js';
import { createShowdownStreamSession } from '../src-next/core/battle/showdown-stream-session.js';
import { commitShowdownStreamTerminal } from '../src-next/core/battle/showdown-terminal-handoff.js';
import { createInitialGameState } from '../src-next/core/game-state.js';
import { serializeNewCoreSave, restoreNewCoreSave } from '../src-next/core/persistence.js';

const extractorDir = process.argv[2];
if (!extractorDir) {
  console.error('usage: node tests/reconstruction-showdown-real-sleep-roundtrip.mjs <built-pinned-pkmn-ps-checkout>');
  process.exit(2);
}

const artifact = inspectExtractedShowdownArtifact(resolve(extractorDir));
assert.equal(artifact.showdownRevision, REQUIRED_SHOWDOWN_REVISION);
const showdown = await loadShowdownBrowserArtifact(artifact);
assert.equal(showdown.revision, REQUIRED_SHOWDOWN_REVISION);

const wildTeam = [{
  id: 'wild-magikarp', species: 'Magikarp', name: 'Magikarp', level: 5,
  ability: 'Swift Swim', hp: 15, status: '', heldItem: '',
  moves: [{ id: 'splash', pp: 40, maxpp: 40 }],
}];

const state = createInitialGameState({
  seed: 5252,
  runId: 'real-showdown-sleep-roundtrip',
  party: [{
    id: 'sleeping-pikachu', species: 'Pikachu', name: 'Pikachu', level: 50,
    ability: 'Static', hp: 60, status: 'slp', statusTurns: 3, heldItem: '',
    moves: [{ id: 'thunderbolt', pp: 3, maxpp: 15 }],
  }],
});

function createSession(party, seed) {
  return createShowdownStreamSession(showdown, {
    formatid: 'gen9customgame', seed,
    p1: { name: 'Mapless', team: party },
    p2: { name: 'Wild', team: wildTeam },
  });
}

const session = createSession(state.party, [9, 10, 11, 12]);
await session.start();
let resolved = session.resolvedState();
let raw = session.battleStream.battle.sides[0].pokemon[0];
assert.equal(resolved.p1[0].status, 'slp');
assert.equal(resolved.p1[0].statusTurns, 3, 'persisted Sleep counter must hydrate into adapter state');
assert.equal(Number(raw.statusState.time), 3, 'persisted Sleep counter must hydrate into raw pinned Showdown');
assert.equal(Number(raw.statusState.startTime), 3);
assert.equal(resolved.p1[0].moves[0].pp, 3);

// Let Showdown own one real turn of Sleep semantics. The sleeping move does not
// execute, so PP must remain unchanged while Showdown decrements statusState.time.
await Promise.all([session.fight('p1', 1), session.fight('p2', 1)]);
resolved = session.resolvedState();
raw = session.battleStream.battle.sides[0].pokemon[0];
assert.equal(resolved.terminal, false);
assert.equal(resolved.p1[0].status, 'slp');
assert.equal(resolved.p1[0].statusTurns, 2, 'adapter must observe Showdown-authoritative remaining Sleep turns');
assert.equal(Number(raw.statusState.time), 2, 'raw pinned Showdown must own the Sleep decrement');
assert.equal(resolved.p1[0].moves[0].pp, 3, 'a move prevented by Sleep must not consume PP');

// End through Showdown protocol without inventing Mapless battle semantics. This
// leaves the authoritative p1 persistent state available for the terminal handoff.
await session.choose('p2', 'forfeit');
const terminal = session.resolvedState();
assert.equal(terminal.terminal, true);
assert.equal(terminal.p1[0].status, 'slp');
assert.equal(terminal.p1[0].statusTurns, 2);
assert.equal(terminal.p1[0].moves[0].pp, 3);

const committed = commitShowdownStreamTerminal(state, {
  battleId: 'real-showdown-sleep-battle-1', session,
});
assert.equal(committed.committed, true);
assert.equal(committed.duplicate, false);
assert.equal(committed.state.party[0].status, 'slp');
assert.equal(committed.state.party[0].statusTurns, 2, 'remaining Sleep turns must commit exactly once');
assert.equal(committed.state.party[0].moves[0].pp, 3);

const restored = restoreNewCoreSave(serializeNewCoreSave(committed.state));
assert.equal(restored.party[0].status, 'slp');
assert.equal(restored.party[0].statusTurns, 2, 'remaining Sleep turns must survive save/reload');
const replay = commitShowdownStreamTerminal(restored, {
  battleId: 'real-showdown-sleep-battle-1', session,
});
assert.equal(replay.committed, false);
assert.equal(replay.duplicate, true);
assert.equal(replay.state, restored);

const reprojectedSession = createSession(restored.party, [13, 14, 15, 16]);
await reprojectedSession.start();
const reprojected = reprojectedSession.resolvedState();
const reprojectedRaw = reprojectedSession.battleStream.battle.sides[0].pokemon[0];
assert.equal(reprojected.p1[0].status, 'slp');
assert.equal(reprojected.p1[0].statusTurns, 2, 'reloaded Sleep counter must project into the next battle');
assert.equal(Number(reprojectedRaw.statusState.time), 2, 'raw pinned Showdown must receive the reloaded Sleep counter');
assert.equal(Number(reprojectedRaw.statusState.startTime), 2);
assert.equal(reprojected.p1[0].moves[0].pp, 3);

console.log(JSON.stringify({
  ok: true,
  showdownRevision: showdown.revision,
  terminalSleepTurns: terminal.p1[0].statusTurns,
  restoredSleepTurns: restored.party[0].statusTurns,
  reprojectedSleepTurns: reprojected.p1[0].statusTurns,
}, null, 2));
