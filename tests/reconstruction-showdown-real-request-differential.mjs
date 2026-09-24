import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { inspectExtractedShowdownArtifact } from '../scripts/showdown-browser-artifact-contract.mjs';
import { loadShowdownBrowserArtifact, REQUIRED_SHOWDOWN_REVISION } from '../src-next/core/battle/showdown-browser-artifact.js';
import { createShowdownStreamSession } from '../src-next/core/battle/showdown-stream-session.js';
import { createShowdownBattleSnapshot } from '../src-next/core/battle/showdown-roundtrip.js';

const extractorDir = process.argv[2];
if (!extractorDir) {
  console.error('usage: node tests/reconstruction-showdown-real-request-differential.mjs <built-pinned-pkmn-ps-checkout>');
  process.exit(2);
}

const artifact = inspectExtractedShowdownArtifact(resolve(extractorDir));
assert.equal(artifact.showdownRevision, REQUIRED_SHOWDOWN_REVISION);
const showdown = await loadShowdownBrowserArtifact(artifact);
assert.equal(showdown.revision, REQUIRED_SHOWDOWN_REVISION);

const p1PersistentTeam = [{
  id: 'request-pikachu', species: 'Pikachu', name: 'Pikachu', level: 50, ability: 'Static',
  // With the projected set (no explicit EVs/IVs), pinned Showdown constructs level-50 Pikachu at 85 max HP.
  // Keep persistent maxhp identical to that authoritative generated ceiling so this harness reaches hydration.
  hp: 17, maxhp: 85, status: 'slp', statusTurns: 3, heldItem: 'oranberry', fainted: false,
  moves: [{ id: 'thunderbolt', pp: 4, maxpp: 24 }],
}];
const p2PersistentTeam = [{
  id: 'request-magikarp', species: 'Magikarp', name: 'Magikarp', level: 5, ability: 'Swift Swim',
  hp: 11, maxhp: 18, status: '', heldItem: '', fainted: false,
  moves: [{ id: 'splash', pp: 9, maxpp: 64 }],
}];

function projectedParty(party, battleId) {
  return createShowdownBattleSnapshot({ party }, { battleId }).party;
}
const p1Team = projectedParty(p1PersistentTeam, 'real-request-differential-p1');
const p2Team = projectedParty(p2PersistentTeam, 'real-request-differential-p2');

const session = createShowdownStreamSession(showdown, {
  formatid: 'gen9customgame', seed: [11, 12, 13, 14],
  p1: { name: 'Mapless', team: p1Team }, p2: { name: 'Wild', team: p2Team },
});
await session.start();
const battle = session.battleStream.battle;
const adapterStarting = session.resolvedState();

function normalizeId(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function conditionParts(condition) {
  const text = String(condition ?? '').trim();
  if (text === '0 fnt') return { hp: 0, maxhp: null, status: 'fnt' };
  const [health = '', status = ''] = text.split(/\s+/, 2);
  const match = /^(\d+)\/(\d+)$/.exec(health);
  assert.ok(match, `unexpected Showdown request condition: ${condition}`);
  return { hp: Number(match[1]), maxhp: Number(match[2]), status };
}

function assertPersistentMatchesRaw(sideIndex, sourceTeam) {
  const side = battle.sides[sideIndex];
  assert.equal(side.pokemon.length, sourceTeam.length);
  side.pokemon.forEach((pokemon, index) => {
    const source = sourceTeam[index];
    assert.equal(Number(pokemon.hp), Number(source.hp), `p${sideIndex + 1}[${index}] raw HP must equal persistent starting HP`);
    assert.equal(Number(pokemon.maxhp), Number(source.maxhp), `p${sideIndex + 1}[${index}] raw max HP must equal persistent max HP`);
    assert.equal(String(pokemon.status ?? ''), String(source.status ?? '').toLowerCase(), `p${sideIndex + 1}[${index}] raw status must equal persistent starting status`);
    assert.equal(normalizeId(pokemon.item), normalizeId(source.heldItem), `p${sideIndex + 1}[${index}] raw item must equal persistent starting item`);
    assert.equal(Boolean(pokemon.fainted), Boolean(source.fainted), `p${sideIndex + 1}[${index}] raw faint must equal persistent starting faint`);
    if (String(source.status ?? '').toLowerCase() === 'slp') {
      assert.equal(Number(pokemon.statusState?.time), Number(source.statusTurns), `p${sideIndex + 1}[${index}] raw Sleep turns must equal persistent statusTurns`);
    }
    assert.equal(pokemon.moveSlots.length, source.moves.length);
    pokemon.moveSlots.forEach((slot, moveIndex) => {
      const sourceMove = source.moves[moveIndex];
      assert.equal(normalizeId(slot.id), normalizeId(sourceMove.id), `p${sideIndex + 1}[${index}] raw move id must equal persistent move id`);
      assert.equal(Number(slot.pp), Number(sourceMove.pp), `p${sideIndex + 1}[${index}] raw move PP must equal persistent starting PP`);
      assert.equal(Number(slot.maxpp), Number(sourceMove.maxpp), `p${sideIndex + 1}[${index}] raw move max PP must equal persistent max PP`);
    });
  });
}

function assertAdapterMatchesRaw(sideKey, sideIndex) {
  const rawSide = battle.sides[sideIndex];
  const adapterSide = adapterStarting[sideKey];
  assert.equal(adapterSide.length, rawSide.pokemon.length, `${sideKey} adapter/raw team length must match`);
  rawSide.pokemon.forEach((pokemon, index) => {
    const projected = adapterSide[index];
    assert.equal(projected.hp, Number(pokemon.hp), `${sideKey}[${index}] adapter HP must equal raw Showdown HP`);
    assert.equal(projected.maxhp, Number(pokemon.maxhp), `${sideKey}[${index}] adapter max HP must equal raw Showdown max HP`);
    assert.equal(projected.status, String(pokemon.status ?? ''), `${sideKey}[${index}] adapter status must equal raw Showdown status`);
    assert.equal(projected.heldItem, String(pokemon.item ?? ''), `${sideKey}[${index}] adapter item must equal raw Showdown item`);
    assert.equal(projected.fainted, Boolean(pokemon.fainted), `${sideKey}[${index}] adapter faint must equal raw Showdown faint`);
    if (projected.status === 'slp') {
      assert.equal(projected.statusTurns, Number(pokemon.statusState?.time), `${sideKey}[${index}] adapter Sleep turns must equal raw Showdown counter`);
    }
    const rawPersistentMoves = Array.isArray(pokemon.baseMoveSlots) && pokemon.baseMoveSlots.length ? pokemon.baseMoveSlots : pokemon.moveSlots;
    assert.equal(projected.moves.length, rawPersistentMoves.length, `${sideKey}[${index}] adapter/raw persistent move count must match`);
    projected.moves.forEach((move, moveIndex) => {
      const rawMove = rawPersistentMoves[moveIndex];
      assert.equal(normalizeId(move.id), normalizeId(rawMove.id), `${sideKey}[${index}] adapter move id must equal raw Showdown persistent slot`);
      assert.equal(move.pp, Number(rawMove.pp), `${sideKey}[${index}] adapter PP must equal raw Showdown persistent slot`);
      assert.equal(move.maxpp, Number(rawMove.maxpp), `${sideKey}[${index}] adapter max PP must equal raw Showdown persistent slot`);
    });
  });
}

function assertRequestMatchesRaw(sideIndex) {
  const side = battle.sides[sideIndex];
  const request = side.activeRequest;
  assert.ok(request && !request.wait && !request.teamPreview && !request.forceSwitch, `p${sideIndex + 1} must have a move request after hydration`);
  assert.equal(request.side.pokemon.length, side.pokemon.length);
  side.pokemon.forEach((pokemon, index) => {
    const requested = request.side.pokemon[index];
    const condition = conditionParts(requested.condition);
    assert.equal(condition.hp, Number(pokemon.hp), `p${sideIndex + 1}[${index}] request HP must equal raw Showdown HP`);
    assert.equal(condition.maxhp, Number(pokemon.maxhp), `p${sideIndex + 1}[${index}] request max HP must equal raw Showdown max HP`);
    assert.equal(condition.status, pokemon.status ? String(pokemon.status) : '', `p${sideIndex + 1}[${index}] request status must equal raw Showdown status`);
    assert.equal(String(requested.item ?? ''), String(pokemon.item ?? ''), `p${sideIndex + 1}[${index}] request item must equal raw Showdown item`);
  });

  const activePokemon = side.active[0];
  assert.ok(activePokemon, `p${sideIndex + 1} must have an active Pokemon`);
  assert.equal(request.active.length, 1);
  const requestedMoves = request.active[0].moves;
  assert.equal(requestedMoves.length, activePokemon.moveSlots.length);
  activePokemon.moveSlots.forEach((slot, index) => {
    assert.equal(String(requestedMoves[index].id), String(slot.id), `p${sideIndex + 1} move id must equal raw Showdown slot`);
    assert.equal(Number(requestedMoves[index].pp), Number(slot.pp), `p${sideIndex + 1} move PP must equal raw Showdown slot`);
    assert.equal(Number(requestedMoves[index].maxpp), Number(slot.maxpp), `p${sideIndex + 1} move max PP must equal raw Showdown slot`);
  });
}

assertPersistentMatchesRaw(0, p1PersistentTeam);
assertPersistentMatchesRaw(1, p2PersistentTeam);
assertAdapterMatchesRaw('p1', 0);
assertAdapterMatchesRaw('p2', 1);
assertRequestMatchesRaw(0);
assertRequestMatchesRaw(1);
assert.equal(battle.sides[0].pokemon[0].statusState.time, 3, 'request regeneration must not consume persisted Sleep turns');

console.log(JSON.stringify({ ok: true, showdownRevision: showdown.revision, p1Adapter: adapterStarting.p1, p2Adapter: adapterStarting.p2, p1Request: battle.sides[0].activeRequest, p2Request: battle.sides[1].activeRequest }, null, 2));