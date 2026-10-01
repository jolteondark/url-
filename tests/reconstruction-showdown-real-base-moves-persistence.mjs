import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { inspectExtractedShowdownArtifact } from '../scripts/showdown-browser-artifact-contract.mjs';
import { loadShowdownBrowserArtifact, REQUIRED_SHOWDOWN_REVISION } from '../src-next/core/battle/showdown-browser-artifact.js';
import { createShowdownStreamSession } from '../src-next/core/battle/showdown-stream-session.js';
import { projectMaplessPartyToShowdown } from '../src-next/core/battle/showdown-roundtrip.js';
import { commitShowdownStreamTerminal } from '../src-next/core/battle/showdown-terminal-handoff.js';
import { createInitialGameState } from '../src-next/core/game-state.js';
import { serializeNewCoreSave, restoreNewCoreSave } from '../src-next/core/persistence.js';
import { assertPersistentRawDifferential, assertRequestRawDifferential } from './helpers/reconstruction-showdown-real-assertions.mjs';

const extractorDir = process.argv[2];
if (!extractorDir) {
  console.error('usage: node tests/reconstruction-showdown-real-base-moves-persistence.mjs <built-pinned-pkmn-ps-checkout>');
  process.exit(2);
}

const artifact = inspectExtractedShowdownArtifact(resolve(extractorDir));
assert.equal(artifact.showdownRevision, REQUIRED_SHOWDOWN_REVISION);
const showdown = await loadShowdownBrowserArtifact(artifact);
assert.equal(showdown.revision, REQUIRED_SHOWDOWN_REVISION);

const state = createInitialGameState({ seed: 1314, runId: 'real-base-moves', party: [{
      name: 'Ditto', species: 'Ditto', level: 50, ability: 'Imposter',
      moves: [{ id: 'transform', pp: 7, maxpp: 10 }],
      id: 'persistent-ditto',
      hp: 80, maxhp: 123, status: '', heldItem: '', fainted: false,
}] });
const wildParty = [{
      name: 'Pikachu', species: 'Pikachu', level: 50, ability: 'Static',
      moves: [{ id: 'thunderbolt', pp: 15, maxpp: 15 }],
      id: 'wild-pikachu',
      hp: 110, maxhp: 110, status: '', heldItem: '', fainted: false,
}];
function createSession(party, seed) {
  return createShowdownStreamSession(showdown, {
    formatid: 'gen9customgame', seed,
    p1: { name: 'Mapless', team: projectMaplessPartyToShowdown(party) },
    p2: { name: 'Wild', team: projectMaplessPartyToShowdown(wildParty) },
  });
}
const session = createSession(state.party, [13, 14, 15, 16]);
const before = structuredClone(state.party);

await session.start();
const pokemon = session.battleStream.battle.sides[0].pokemon[0];
assert.ok(Array.isArray(pokemon.baseMoveSlots), 'pinned Showdown must expose baseMoveSlots');
assert.ok(Array.isArray(pokemon.moveSlots), 'pinned Showdown must expose executable moveSlots');
assert.equal(pokemon.baseMoveSlots[0].id, 'transform');
assert.equal(pokemon.baseMoveSlots[0].pp, 7);
assert.equal(pokemon.baseMoveSlots[0].maxpp, 10);

// Imposter has actually run inside the pinned engine's initial switch-in. Never
// manufacture a replacement moveSlots array in this real-engine harness.
assert.equal(pokemon.transformed, true, 'real Showdown must execute Imposter/Transform');
assert.equal(pokemon.species.id, 'pikachu');
assert.equal(pokemon.ability, 'static');
assert.equal(pokemon.baseSpecies.id, 'ditto');
assert.equal(pokemon.baseAbility, 'imposter');
const projected = session.resolvedState();
assert.equal(projected.p1[0].maplessId, 'persistent-ditto');
assert.deepEqual(projected.p1[0].moves, [{ id: 'transform', pp: 7, maxpp: 10 }]);
assert.equal(pokemon.moveSlots[0].id, 'thunderbolt', 'fixture must retain divergent transient executable state');
assert.equal(pokemon.baseMoveSlots[0].id, 'transform', 'fixture must retain the persistent base moveset');
assert.equal(pokemon.moveSlots[0].pp, 5);
assert.equal(pokemon.moveSlots[0].maxpp, 5);
assertPersistentRawDifferential(pokemon, state.party[0], projected.p1[0], 'Imposter start');
assertRequestRawDifferential(pokemon.side, 'Imposter start');

await Promise.all([session.fight('p1', 1), session.fight('p2', 1)]);
assert.equal(session.resolvedState().terminal, false);
assert.equal(pokemon.moveSlots[0].pp, 4, 'real transformed FIGHT must consume transient PP');
assert.equal(pokemon.baseMoveSlots[0].pp, 7, 'transformed FIGHT must not consume persistent Transform PP');
assertRequestRawDifferential(pokemon.side, 'Imposter after FIGHT');
assert.deepEqual(state.party, before, 'Imposter and FIGHT must not mutate persistence before commit');
await session.streams.omniscient.write('>forcelose p2');
const terminal = session.resolvedState();
assert.equal(terminal.terminal, true);
assert.equal(pokemon.transformed, true, 'terminal must retain real divergent executable moves');
const committed = commitShowdownStreamTerminal(state, { battleId: 'real-base-moves-battle-1', session });
assert.equal(committed.committed, true);
assertPersistentRawDifferential(pokemon, committed.state.party[0], terminal.p1[0], 'Imposter terminal commit');
assert.equal(committed.state.party[0].species, 'Ditto');
assert.equal(committed.state.party[0].ability, 'Imposter');
assert.equal(commitShowdownStreamTerminal(committed.state, { battleId: 'real-base-moves-battle-1', session }).duplicate, true);
const restored = restoreNewCoreSave(serializeNewCoreSave(committed.state));
assertPersistentRawDifferential(pokemon, restored.party[0], terminal.p1[0], 'Imposter reload');
const replay = commitShowdownStreamTerminal(restored, { battleId: 'real-base-moves-battle-1', session });
assert.equal(replay.committed, false);
assert.equal(replay.duplicate, true);
assert.equal(replay.state, restored);
const next = createSession(restored.party, [21, 22, 23, 24]);
await next.start();
const nextPokemon = next.battleStream.battle.sides[0].pokemon[0];
assertPersistentRawDifferential(nextPokemon, restored.party[0], next.resolvedState().p1[0], 'Imposter reprojection');
assertRequestRawDifferential(nextPokemon.side, 'Imposter reprojection');
assert.equal(nextPokemon.moveSlots[0].pp, 5, 'fresh Imposter state must be owned by Showdown');
assert.equal(nextPokemon.baseMoveSlots[0].pp, 7);

console.log(JSON.stringify({ ok: true, showdownRevision: showdown.revision, realTransform: true, persistentMoves: terminal.p1[0].moves, transientMove: pokemon.moveSlots[0].id, transientPP: pokemon.moveSlots[0].pp, replayRejected: replay.duplicate, rawRequestDifferentials: 0 }, null, 2));
