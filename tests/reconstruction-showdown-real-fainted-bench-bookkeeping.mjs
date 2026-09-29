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

const persistedStart = {
  id: 'persisted-start', species: 'Pikachu', name: 'Pikachu', level: 50, ability: 'Static',
  hp: 60, maxhp: 110, status: 'par', heldItem: 'oranberry', fainted: false,
  moves: [{ id: 'thunderbolt', pp: 7, maxpp: 15 }],
};
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

const persistedSession = await startCase([persistedStart], 'persistent-start-request-regression');
const persistedSide = persistedSession.battleStream.battle.sides[0];
const persistedProjected = persistedSession.resolvedState();
assert.equal(persistedSide.pokemon[0].hp, 60, 'starting HP must be hydrated before authoritative start');
assert.equal(persistedSide.pokemon[0].status, 'par', 'starting status must be hydrated before authoritative start');
assert.equal(persistedSide.pokemon[0].item, 'oranberry', 'starting held item must be hydrated before authoritative start');
assert.equal(persistedSide.pokemon[0].moveSlots[0].pp, 7, 'starting PP must be hydrated before authoritative start');
assert.equal(persistedProjected.p1[0].hp, 60, 'resolved starting HP must remain exact before FIGHT');
assert.equal(persistedProjected.p1[0].status, 'par', 'resolved starting status must remain exact before FIGHT');
assert.equal(persistedProjected.p1[0].heldItem, 'oranberry', 'resolved starting held item must remain exact before FIGHT');
assert.deepEqual(persistedProjected.p1[0].moves, [{ id: 'thunderbolt', pp: 7, maxpp: 15 }], 'resolved starting PP must remain exact before FIGHT');

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


function parseRequestCondition(condition) {
  const text = String(condition ?? '').trim();
  if (text === '0 fnt') return { hp: 0, maxhp: null, status: 'fnt' };
  const [health = '', status = ''] = text.split(/\s+/, 2);
  const match = /^(\d+)\/(\d+)$/.exec(health);
  assert.ok(match, `unexpected Showdown request condition: ${condition}`);
  return { hp: Number(match[1]), maxhp: Number(match[2]), status };
}

function assertInitialRequestMatchesRaw(side, label) {
  const request = side.activeRequest;
  assert.ok(request && !request.wait && !request.teamPreview && !request.forceSwitch, `${label} must expose the initial move request`);
  assert.equal(request.side.pokemon.length, side.pokemon.length, `${label} request party length must match raw Showdown state`);
  side.pokemon.forEach((pokemon, index) => {
    const requested = request.side.pokemon[index];
    const condition = parseRequestCondition(requested.condition);
    assert.equal(condition.hp, Number(pokemon.hp), `${label} request HP must match raw Showdown state`);
    if (pokemon.fainted) {
      assert.equal(condition.status, 'fnt', `${label} persisted faint must remain 0 fnt in the request`);
    } else {
      assert.equal(condition.maxhp, Number(pokemon.maxhp), `${label} request max HP must match raw Showdown state`);
      assert.equal(condition.status, String(pokemon.status ?? ''), `${label} request status must match raw Showdown state`);
    }
    assert.equal(String(requested.item ?? ''), String(pokemon.item ?? ''), `${label} request item must match raw Showdown state`);
  });
  const active = side.active[0];
  assert.ok(active, `${label} must have an active Pokemon`);
  assert.equal(request.active.length, 1, `${label} must expose one active request slot`);
  assert.equal(request.active[0].moves.length, active.moveSlots.length, `${label} request move count must match raw Showdown state`);
  active.moveSlots.forEach((slot, index) => {
    const requested = request.active[0].moves[index];
    assert.equal(String(requested.id), String(slot.id), `${label} request move id must match raw Showdown state`);
    assert.equal(Number(requested.pp), Number(slot.pp), `${label} request PP must match raw Showdown state`);
    assert.equal(Number(requested.maxpp), Number(slot.maxpp), `${label} request max PP must match raw Showdown state`);
  });
}

function rawPersistentMoves(pokemon) {
  const slots = Array.isArray(pokemon?.baseMoveSlots) && pokemon.baseMoveSlots.length
    ? pokemon.baseMoveSlots
    : (pokemon?.moveSlots ?? []);
  return slots.map((move) => ({
    id: String(move.id ?? move.move ?? ''),
    pp: Number(move.pp ?? 0),
    maxpp: Number(move.maxpp ?? move.maxPP ?? move.pp ?? 0),
  }));
}

function assertRawPersistentMatch(raw, resolved, label) {
  assert.equal(resolved.hp, Number(raw.hp), `${label} HP must match raw Showdown state`);
  assert.equal(resolved.maxhp, Number(raw.maxhp), `${label} max HP must match raw Showdown state`);
  assert.equal(resolved.status, String(raw.status ?? ''), `${label} status must match raw Showdown state`);
  assert.equal(resolved.heldItem, String(raw.item ?? ''), `${label} held item must match raw Showdown state`);
  assert.equal(resolved.fainted, Boolean(raw.fainted), `${label} faint flag must match raw Showdown state`);
  assert.deepEqual(resolved.moves, rawPersistentMoves(raw), `${label} PP must match raw Showdown state`);
}

assertInitialRequestMatchesRaw(persistedSide, 'persisted-start initial request');
assertRawPersistentMatch(persistedSide.pokemon[0], persistedProjected.p1[0], 'persisted-start raw differential');
assertInitialRequestMatchesRaw(benchSide, 'healthy-lead initial request');
assertInitialRequestMatchesRaw(leadSide, 'fainted-lead initial request');

// Differential guard: compare the adapter's persistent projection directly with
// the pinned Showdown Pokemon objects.  The second case deliberately compares
// battle-local order back to canonical Mapless order.
assertRawPersistentMatch(benchSide.pokemon[0], benchProjected.p1[0], 'healthy lead');
assertRawPersistentMatch(benchSide.pokemon[1], benchProjected.p1[1], 'fainted bench');
assertRawPersistentMatch(leadSide.pokemon[0], leadProjected.p1[1], 'battle-local healthy lead');
assertRawPersistentMatch(leadSide.pokemon[1], leadProjected.p1[0], 'canonical fainted lead');

console.log(JSON.stringify({
  ok: true,
  showdownRevision: showdown.revision,
  healthyLead: { pokemonLeft: benchSide.pokemonLeft, canSwitch: benchBattle.canSwitch(benchSide), projectedP1: benchProjected.p1 },
  faintedLead: { pokemonLeft: leadSide.pokemonLeft, canSwitch: leadBattle.canSwitch(leadSide), projectedP1: leadProjected.p1 },
}, null, 2));
