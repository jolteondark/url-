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

const healthy = {
  id: 'healthy', species: 'Pikachu', name: 'Pikachu', level: 50, ability: 'Static',
  hp: 60, maxhp: 110, status: '', heldItem: '', fainted: false,
  moves: [{ id: 'thunderbolt', pp: 15, maxpp: 15 }],
};
const fainted = {
  id: 'fainted', species: 'Magikarp', name: 'Magikarp', level: 5, ability: 'Swift Swim',
  hp: 0, maxhp: 18, status: '', heldItem: '', fainted: true,
  moves: [{ id: 'splash', pp: 40, maxpp: 40 }],
};
const wildParty = [{
  id: 'wild-magikarp', species: 'Magikarp', name: 'Magikarp', level: 5, ability: 'Swift Swim',
  hp: 18, maxhp: 18, status: '', heldItem: '', fainted: false,
  moves: [{ id: 'splash', pp: 40, maxpp: 40 }],
}];

async function startCase(playerParty, battleId) {
  const session = createShowdownStreamSession(showdown, {
    formatid: 'gen9customgame', seed: [17, 18, 19, 20],
    p1: { name: 'Mapless', team: createShowdownBattleSnapshot({ party: playerParty }, { battleId }).party },
    p2: { name: 'Wild', team: projectMaplessPartyToShowdown(wildParty) },
  });
  await session.start();
  return session;
}

const benchSession = await startCase([
  { ...healthy, id: 'healthy-lead' },
  { ...fainted, id: 'fainted-bench' },
], 'fainted-bench-regression');
const benchBattle = benchSession.battleStream.battle;
const benchSide = benchBattle.sides[0];
const benchProjected = benchSession.resolvedState();

assert.equal(benchProjected.p1[0].hp, 60, 'healthy lead HP must survive pre-start hydration');
assert.equal(benchProjected.p1[0].fainted, false, 'healthy lead must remain available');
assert.equal(benchProjected.p1[1].hp, 0, 'persisted fainted bench HP must survive pre-start hydration');
assert.equal(benchProjected.p1[1].fainted, true, 'persisted fainted bench must remain fainted');
assert.equal(benchSide.pokemonLeft, 1, 'Showdown live-party bookkeeping must count only non-fainted persisted party members after start');
assert.equal(benchBattle.canSwitch(benchSide), 0, 'persisted fainted bench must not become a legal switch resource');
assert.equal(benchSide.active[0], benchSide.pokemon[0], 'healthy lead must be the initial active Pokemon');

// A persisted fainted member may occupy canonical slot 1 after a previous battle.
// The adapter keeps canonical Mapless order but projects the first live member as the
// battle-local Showdown lead so Showdown still owns the actual initial switch-in.
const leadSession = await startCase([
  { ...fainted, id: 'fainted-lead' },
  { ...healthy, id: 'healthy-bench' },
], 'fainted-lead-regression');
const leadBattle = leadSession.battleStream.battle;
const leadSide = leadBattle.sides[0];
const leadProjected = leadSession.resolvedState();

assert.equal(leadProjected.p1[0].hp, 0, 'persisted fainted lead HP must survive pre-start hydration');
assert.equal(leadProjected.p1[0].fainted, true, 'persisted fainted lead must remain fainted');
assert.equal(leadProjected.p1[1].hp, 60, 'healthy bench HP must survive pre-start hydration');
assert.equal(leadProjected.p1[1].fainted, false, 'healthy bench must remain available');
assert.equal(leadSide.pokemonLeft, 1, 'fainted lead must not inflate Showdown live-party bookkeeping');
assert.equal(leadBattle.canSwitch(leadSide), 0, 'only one persisted live party member must leave no switch resource');
assert.equal(leadProjected.p1[0].maplessId, 'fainted-lead', 'resolved projection must restore canonical Mapless party order');
assert.deepEqual(leadProjected.p1[0].moves, [{ id: 'splash', pp: 40, maxpp: 40 }], 'fainted member PP must remain attached to its stable Mapless identity across battle-local lead ordering');
assert.equal(leadProjected.p1[1].maplessId, 'healthy-bench', 'resolved projection must restore the canonical live member position');
assert.deepEqual(leadProjected.p1[1].moves, [{ id: 'thunderbolt', pp: 15, maxpp: 15 }], 'live member PP must remain attached to its stable Mapless identity across battle-local lead ordering');
assert.equal(leadSide.pokemon[0].name, 'Pikachu', 'battle-local Showdown order must put the first live member in slot 1');
assert.equal(leadSide.active[0], leadSide.pokemon[0], 'Showdown must own initial switch-in of the battle-local live lead');

console.log(JSON.stringify({
  ok: true,
  showdownRevision: showdown.revision,
  healthyLead: { pokemonLeft: benchSide.pokemonLeft, canSwitch: benchBattle.canSwitch(benchSide), projectedP1: benchProjected.p1 },
  faintedLead: { pokemonLeft: leadSide.pokemonLeft, canSwitch: leadBattle.canSwitch(leadSide), projectedP1: leadProjected.p1 },
}, null, 2));
