import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { inspectExtractedShowdownArtifact } from '../scripts/showdown-browser-artifact-contract.mjs';
import { loadShowdownBrowserArtifact, REQUIRED_SHOWDOWN_REVISION } from '../src-next/core/battle/showdown-browser-artifact.js';
import { createShowdownStreamSession } from '../src-next/core/battle/showdown-stream-session.js';
import { commitShowdownStreamTerminal } from '../src-next/core/battle/showdown-terminal-handoff.js';
import { createShowdownBattleSnapshot, projectMaplessPartyToShowdown } from '../src-next/core/battle/showdown-roundtrip.js';
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

const wildPersistentTeam = [{
  id: 'wild-magikarp', species: 'Magikarp', name: 'Magikarp', level: 5, ability: 'Swift Swim',
  hp: 15, maxhp: 18, status: '', heldItem: '', fainted: false,
  moves: [{ id: 'splash', pp: 40, maxpp: 40 }],
}];
const wildTeam = projectMaplessPartyToShowdown(wildPersistentTeam);

const state = createInitialGameState({
  seed: 4242,
  runId: 'real-showdown-roundtrip',
  party: [{
    id: 'starter-pikachu', species: 'Pikachu', name: 'Pikachu', level: 50, ability: 'Static',
    hp: 60, maxhp: 110, status: 'brn', heldItem: 'throatspray', fainted: false,
    moves: [{ id: 'hypervoice', pp: 3, maxpp: 10 }],
    boosts: { spa: -2 }, volatile: { seeded: true },
  }],
});
const persistentBeforeBattle = structuredClone(state.party);

function projectedParty(party, battleId) {
  return createShowdownBattleSnapshot({ party }, { battleId }).party;
}
function createSession(party, seed = [1, 2, 3, 4], battleId = 'real-showdown-battle-1') {
  return createShowdownStreamSession(showdown, {
    formatid: 'gen9customgame', seed,
    p1: { name: 'Mapless', team: projectedParty(party, battleId) },
    p2: { name: 'Wild', team: wildTeam },
  });
}

const session = createSession(state.party);

function rawPokemon(pokemon) {
  return {
    hp: Number(pokemon.hp), maxhp: Number(pokemon.maxhp), status: pokemon.status ? String(pokemon.status) : '',
    heldItem: pokemon.item ? String(pokemon.item) : '', fainted: Boolean(pokemon.fainted),
    moves: (pokemon.moveSlots ?? []).map((move) => ({ id: String(move.id ?? move.move ?? ''), pp: Number(move.pp), maxpp: Number(move.maxpp ?? move.maxPP ?? move.pp) })),
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
assert.equal(starting.p1[0].heldItem, 'throatspray', 'persistent held item must project into real Showdown before FIGHT');
assert.equal(starting.p1[0].moves[0].pp, 3, 'persistent PP must hydrate into real Showdown before FIGHT');
assert.equal(starting.p1[0].moves[0].maxpp, 10, 'persistent maxPP must replace Showdown PP-Up-expanded maxPP before FIGHT');
assert.deepEqual(state.party, persistentBeforeBattle, 'Showdown initialization must not mutate persistent Mapless party state');

await Promise.all([session.fight('p1', 1), session.fight('p2', 1)]);
const terminal = session.resolvedState();
assertAdapterMatchesRawShowdown(terminal, session.battleStream.battle);
assert.equal(terminal.terminal, true, 'fixture must terminate in one real Showdown turn');
assert.equal(terminal.p2[0].fainted, true, 'real Showdown must authoritatively resolve the wild faint');
assert.equal(terminal.p1[0].status, 'brn', 'persistent status must survive the authoritative Showdown turn');
assert.equal(terminal.p1[0].heldItem, '', 'real Showdown must authoritatively consume Throat Spray after Hyper Voice');
assert.equal(terminal.p1[0].moves[0].pp, 2, 'real Showdown must authoritatively consume one PP');
const terminalPokemon = session.battleStream.battle.sides[0].pokemon[0];
assert.equal(terminalPokemon.moveSlots[0].pp, 2, 'pinned Showdown executable moveSlots must consume one PP');
assert.equal(terminalPokemon.baseMoveSlots[0].pp, 2, 'pinned Showdown persistent baseMoveSlots must mirror consumed PP for the original moveset');
assert.equal(terminal.p1[0].moves[0].pp, terminalPokemon.baseMoveSlots[0].pp, 'adapter terminal PP must come from the persistent base moveset without losing real PP consumption');
assert.equal(terminal.p1[0].moves[0].maxpp, 10, 'authoritative Showdown turn must retain the hydrated persistent maxPP bound');
assert.equal(session.battleStream.battle.sides[0].pokemon[0].boosts.spa, 1, 'real Showdown must own the transient Throat Spray SpA boost');
assert.deepEqual(state.party, persistentBeforeBattle, 'FIGHT must not mutate persistent Mapless party before terminal commit');

const committed = commitShowdownStreamTerminal(state, { battleId: 'real-showdown-battle-1', session });
assert.equal(committed.committed, true); assert.equal(committed.duplicate, false);
assert.equal(committed.state.party[0].hp, terminal.p1[0].hp);
assert.equal(committed.state.party[0].status, 'brn');
assert.equal(committed.state.party[0].heldItem, '', 'consumed held item must commit back to Mapless');
assert.equal(committed.state.party[0].moves[0].pp, 2);
assert.equal(committed.state.party[0].moves[0].maxpp, 10, 'persistent maxPP must commit unchanged from authoritative Showdown state');
assert.equal('boosts' in committed.state.party[0], false, 'transient Showdown stat stages must not persist');
assert.equal('volatile' in committed.state.party[0], false, 'transient volatile state must not persist');

const restored = restoreNewCoreSave(serializeNewCoreSave(committed.state));
assert.equal(restored.party[0].hp, terminal.p1[0].hp); assert.equal(restored.party[0].status, 'brn');
assert.equal(restored.party[0].heldItem, '', 'consumed held item must remain consumed after reload');
assert.equal(restored.party[0].moves[0].pp, 2);
assert.equal(restored.party[0].moves[0].maxpp, 10, 'persistent maxPP must survive save/reload');
assert.equal('boosts' in restored.party[0], false); assert.equal('volatile' in restored.party[0], false);
const replay = commitShowdownStreamTerminal(restored, { battleId: 'real-showdown-battle-1', session });
assert.equal(replay.committed, false, 'terminal replay after reload must not commit twice');
assert.equal(replay.duplicate, true); assert.equal(replay.state, restored);

const reprojectedSession = createSession(restored.party, [5, 6, 7, 8], 'real-showdown-battle-2');
await reprojectedSession.start();
const reprojected = reprojectedSession.resolvedState();
assertAdapterMatchesRawShowdown(reprojected, reprojectedSession.battleStream.battle);
assert.equal(reprojected.terminal, false); assert.equal(reprojected.p1[0].maplessId, 'starter-pikachu');
assert.equal(reprojected.p1[0].hp, terminal.p1[0].hp, 'reloaded HP must hydrate into the next real Showdown battle');
assert.equal(reprojected.p1[0].status, 'brn', 'reloaded status must hydrate into the next real Showdown battle');
assert.equal(reprojected.p1[0].heldItem, '', 'consumed held item must not resurrect on reprojection');
assert.equal(reprojected.p1[0].moves[0].pp, 2, 'reloaded PP must hydrate into the next real Showdown battle');
assert.equal(reprojected.p1[0].moves[0].maxpp, 10, 'reloaded maxPP must hydrate into the next real Showdown battle');
assert.equal(reprojectedSession.battleStream.battle.sides[0].pokemon[0].boosts.spa, 0, 'transient stat stages must reset on a fresh battle');

console.log(JSON.stringify({ ok: true, showdownRevision: showdown.revision, turn: terminal.turn, winner: terminal.winner, p1: terminal.p1, p2: terminal.p2, reprojectedP1: reprojected.p1 }, null, 2));