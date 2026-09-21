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
  console.error('usage: node tests/reconstruction-showdown-real-roundtrip.mjs <built-pinned-pkmn-ps-checkout>');
  process.exit(2);
}

const artifact = inspectExtractedShowdownArtifact(resolve(extractorDir));
assert.equal(artifact.showdownRevision, REQUIRED_SHOWDOWN_REVISION);
const showdown = await loadShowdownBrowserArtifact(artifact);
assert.equal(showdown.revision, REQUIRED_SHOWDOWN_REVISION);

const state = createInitialGameState({ seed: 4242, runId: 'real-showdown-roundtrip' });
state.party = [{
  id: 'starter-pikachu',
  species: 'Pikachu',
  name: 'Pikachu',
  level: 50,
  ability: 'Static',
  hp: 60,
  status: 'brn',
  heldItem: 'Light Ball',
  moves: [{ id: 'thunderbolt', pp: 3, maxpp: 15 }],
}];

const session = createShowdownStreamSession(showdown, {
  formatid: 'gen9customgame',
  seed: [1, 2, 3, 4],
  p1: { name: 'Mapless', team: state.party },
  p2: {
    name: 'Wild',
    team: [{
      id: 'wild-magikarp',
      species: 'Magikarp',
      name: 'Magikarp',
      level: 5,
      ability: 'Swift Swim',
      hp: 15,
      status: '',
      heldItem: '',
      moves: [{ id: 'splash', pp: 40, maxpp: 40 }],
    }],
  },
});

function rawPokemon(pokemon) {
  return {
    hp: Number(pokemon.hp),
    maxhp: Number(pokemon.maxhp),
    status: pokemon.status ? String(pokemon.status) : '',
    heldItem: pokemon.item ? String(pokemon.item) : '',
    fainted: Boolean(pokemon.fainted),
    moves: (pokemon.moveSlots ?? []).map((move) => ({
      id: String(move.id ?? move.move ?? ''),
      pp: Number(move.pp),
      maxpp: Number(move.maxpp ?? move.maxPP ?? move.pp),
    })),
  };
}

function assertAdapterMatchesRawShowdown(adapterState, battle) {
  assert.equal(adapterState.terminal, Boolean(battle.ended));
  assert.equal(adapterState.winner, battle.winner ? String(battle.winner) : '');
  assert.equal(adapterState.turn, Number(battle.turn ?? 0));
  for (const [sideKey, sideIndex] of [['p1', 0], ['p2', 1]]) {
    const raw = (battle.sides?.[sideIndex]?.pokemon ?? []).map(rawPokemon);
    assert.equal(adapterState[sideKey].length, raw.length);
    adapterState[sideKey].forEach((projected, index) => {
      const { maplessId: _identityOnly, ...persistent } = projected;
      assert.deepEqual(persistent, raw[index], `${sideKey}[${index}] adapter state must equal raw pinned Showdown state`);
    });
  }
}

await session.start();
const starting = session.resolvedState();
assertAdapterMatchesRawShowdown(starting, session.battleStream.battle);
assert.equal(starting.terminal, false);
assert.equal(starting.p1[0].maplessId, 'starter-pikachu');
assert.equal(starting.p1[0].hp, 60, 'persistent current HP must hydrate into real Showdown before FIGHT');
assert.equal(starting.p1[0].status, 'brn', 'persistent status must hydrate into real Showdown before FIGHT');
assert.equal(starting.p1[0].heldItem, 'lightball', 'persistent held item must project into real Showdown before FIGHT');
assert.equal(starting.p1[0].moves[0].pp, 3, 'persistent PP must hydrate into real Showdown before FIGHT');

// Both choices are submitted to Showdown; Showdown alone owns turn order, damage,
// PP consumption, fainting, residual status damage, and the terminal decision.
await Promise.all([
  session.fight('p1', 1),
  session.fight('p2', 1),
]);

const terminal = session.resolvedState();
assertAdapterMatchesRawShowdown(terminal, session.battleStream.battle);
assert.equal(terminal.terminal, true, 'fixture must terminate in one real Showdown turn');
assert.equal(terminal.p2[0].fainted, true, 'real Showdown must authoritatively resolve the wild faint');
assert.equal(terminal.p1[0].status, 'brn', 'persistent status must survive the authoritative Showdown turn');
assert.equal(terminal.p1[0].heldItem, 'lightball', 'unconsumed held item must survive the authoritative Showdown turn');
assert.equal(terminal.p1[0].moves[0].pp, 2, 'real Showdown must authoritatively consume one PP');

const committed = commitShowdownStreamTerminal(state, {
  battleId: 'real-showdown-battle-1',
  session,
});
assert.equal(committed.committed, true);
assert.equal(committed.duplicate, false);
assert.equal(committed.state.party[0].hp, terminal.p1[0].hp);
assert.equal(committed.state.party[0].status, 'brn');
assert.equal(committed.state.party[0].heldItem, 'lightball');
assert.equal(committed.state.party[0].moves[0].pp, 2);

const restored = restoreNewCoreSave(serializeNewCoreSave(committed.state));
assert.equal(restored.party[0].hp, terminal.p1[0].hp);
assert.equal(restored.party[0].status, 'brn');
assert.equal(restored.party[0].heldItem, 'lightball');
assert.equal(restored.party[0].moves[0].pp, 2);
const replay = commitShowdownStreamTerminal(restored, {
  battleId: 'real-showdown-battle-1',
  session,
});
assert.equal(replay.committed, false, 'terminal replay after reload must not commit twice');
assert.equal(replay.duplicate, true);
assert.equal(replay.state, restored);

console.log(JSON.stringify({
  ok: true,
  showdownRevision: showdown.revision,
  turn: terminal.turn,
  winner: terminal.winner,
  p1: terminal.p1,
  p2: terminal.p2,
}, null, 2));
