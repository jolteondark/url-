import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { inspectExtractedShowdownArtifact } from '../scripts/showdown-browser-artifact-contract.mjs';
import { loadShowdownBrowserArtifact, REQUIRED_SHOWDOWN_REVISION } from '../src-next/core/battle/showdown-browser-artifact.js';
import { createShowdownStreamSession } from '../src-next/core/battle/showdown-stream-session.js';
import { createShowdownBattleSnapshot, projectMaplessPartyToShowdown } from '../src-next/core/battle/showdown-roundtrip.js';

const extractorDir = process.argv[2];
if (!extractorDir) {
  console.error('usage: node tests/reconstruction-showdown-real-fainted-bench-bookkeeping.mjs <built-pinned-pkmn-ps-checkout>');
  process.exit(2);
}

const artifact = inspectExtractedShowdownArtifact(resolve(extractorDir));
assert.equal(artifact.showdownRevision, REQUIRED_SHOWDOWN_REVISION);
const showdown = await loadShowdownBrowserArtifact(artifact);
assert.equal(showdown.revision, REQUIRED_SHOWDOWN_REVISION);

const playerParty = [
  {
    id: 'healthy-lead', species: 'Pikachu', name: 'Pikachu', level: 50, ability: 'Static',
    hp: 60, maxhp: 110, status: '', heldItem: '', fainted: false,
    moves: [{ id: 'thunderbolt', pp: 15, maxpp: 15 }],
  },
  {
    id: 'fainted-bench', species: 'Magikarp', name: 'Magikarp', level: 5, ability: 'Swift Swim',
    hp: 0, maxhp: 18, status: '', heldItem: '', fainted: true,
    moves: [{ id: 'splash', pp: 40, maxpp: 40 }],
  },
];
const wildParty = [{
  id: 'wild-magikarp', species: 'Magikarp', name: 'Magikarp', level: 5, ability: 'Swift Swim',
  hp: 18, maxhp: 18, status: '', heldItem: '', fainted: false,
  moves: [{ id: 'splash', pp: 40, maxpp: 40 }],
}];

const session = createShowdownStreamSession(showdown, {
  formatid: 'gen9customgame', seed: [17, 18, 19, 20],
  p1: { name: 'Mapless', team: createShowdownBattleSnapshot({ party: playerParty }, { battleId: 'fainted-bench-regression' }).party },
  p2: { name: 'Wild', team: projectMaplessPartyToShowdown(wildParty) },
});

await session.start();
const battle = session.battleStream.battle;
const side = battle.sides[0];
const projected = session.resolvedState();

assert.equal(projected.p1[0].hp, 60, 'healthy lead HP must survive pre-start hydration');
assert.equal(projected.p1[0].fainted, false, 'healthy lead must remain available');
assert.equal(projected.p1[1].hp, 0, 'persisted fainted bench HP must survive pre-start hydration');
assert.equal(projected.p1[1].fainted, true, 'persisted fainted bench must remain fainted');
assert.equal(side.pokemonLeft, 1, 'Showdown live-party bookkeeping must count only non-fainted persisted party members after start');
assert.equal(battle.canSwitch(side), 0, 'persisted fainted bench must not become a legal switch resource');
assert.equal(side.active[0], side.pokemon[0], 'healthy lead must be the initial active Pokemon');

console.log(JSON.stringify({
  ok: true,
  showdownRevision: showdown.revision,
  pokemonLeft: side.pokemonLeft,
  canSwitch: battle.canSwitch(side),
  projectedP1: projected.p1,
}, null, 2));
