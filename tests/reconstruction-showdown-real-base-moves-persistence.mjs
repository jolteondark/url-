import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { inspectExtractedShowdownArtifact } from '../scripts/showdown-browser-artifact-contract.mjs';
import { loadShowdownBrowserArtifact, REQUIRED_SHOWDOWN_REVISION } from '../src-next/core/battle/showdown-browser-artifact.js';
import { createShowdownStreamSession } from '../src-next/core/battle/showdown-stream-session.js';

const extractorDir = process.argv[2];
if (!extractorDir) {
  console.error('usage: node tests/reconstruction-showdown-real-base-moves-persistence.mjs <built-pinned-pkmn-ps-checkout>');
  process.exit(2);
}

const artifact = inspectExtractedShowdownArtifact(resolve(extractorDir));
assert.equal(artifact.showdownRevision, REQUIRED_SHOWDOWN_REVISION);
const showdown = await loadShowdownBrowserArtifact(artifact);
assert.equal(showdown.revision, REQUIRED_SHOWDOWN_REVISION);

const session = createShowdownStreamSession(showdown, {
  formatid: 'gen9customgame',
  seed: [13, 14, 15, 16],
  p1: {
    name: 'Mapless',
    team: [{
      name: 'Ditto', species: 'Ditto', level: 50, ability: 'Imposter',
      moves: ['transform'],
      maplessId: 'persistent-ditto',
      maplessPersistent: {
        hp: 80, maxhp: 100, status: '', heldItem: '', fainted: false,
        moves: [{ id: 'transform', pp: 7, maxpp: 10 }],
      },
    }],
  },
  p2: {
    name: 'Wild',
    team: [{ name: 'Pikachu', species: 'Pikachu', level: 50, ability: 'Static', moves: ['thunderbolt'] }],
  },
});

await session.start();
const pokemon = session.battleStream.battle.sides[0].pokemon[0];
assert.ok(Array.isArray(pokemon.baseMoveSlots), 'pinned Showdown must expose baseMoveSlots');
assert.ok(Array.isArray(pokemon.moveSlots), 'pinned Showdown must expose executable moveSlots');
assert.equal(pokemon.baseMoveSlots[0].id, 'transform');
assert.equal(pokemon.baseMoveSlots[0].pp, 7);
assert.equal(pokemon.baseMoveSlots[0].maxpp, 10);

// Model the engine-owned transient replacement performed by Transform without
// reimplementing Transform mechanics. The persistence boundary must continue to
// read the authoritative base moveset, not executable/transient moveSlots.
pokemon.moveSlots = [{ move: 'Thunderbolt', id: 'thunderbolt', pp: 5, maxpp: 5, target: 'normal', disabled: false, disabledSource: '' }];
const projected = session.resolvedState();
assert.equal(projected.p1[0].maplessId, 'persistent-ditto');
assert.deepEqual(projected.p1[0].moves, [{ id: 'transform', pp: 7, maxpp: 10 }]);
assert.equal(pokemon.moveSlots[0].id, 'thunderbolt', 'fixture must retain divergent transient executable state');
assert.equal(pokemon.baseMoveSlots[0].id, 'transform', 'fixture must retain the persistent base moveset');

console.log(JSON.stringify({ ok: true, showdownRevision: showdown.revision, persistentMoves: projected.p1[0].moves, transientMove: pokemon.moveSlots[0].id }, null, 2));
