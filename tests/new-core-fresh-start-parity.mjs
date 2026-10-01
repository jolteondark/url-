import assert from 'node:assert/strict';
import { createSafariPlayableRuntime } from '../runtime/safari-web-startup.js';
import { createFreshRunState } from '../src-next/core/run/fresh-start.js';

function normalizeId(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}
function normalizeLegacyStarter(pokemon) {
  return {
    personalId: Number(pokemon.personal_id),
    species: normalizeId(pokemon.species),
    level: Number(pokemon.level),
    exp: Number(pokemon.exp),
    hp: Number(pokemon.hp),
    maxhp: Number(pokemon.max_hp),
    status: pokemon.status === 'NONE' ? '' : normalizeId(pokemon.status),
    heldItem: pokemon.item == null ? '' : normalizeId(pokemon.item),
    abilityId: normalizeId(pokemon.ability_id),
    nature: String(pokemon.nature_id),
    iv: structuredClone(pokemon.iv),
    ev: structuredClone(pokemon.ev),
    moves: pokemon.moves.map((move) => ({
      id: normalizeId(move.id),
      pp: Number(move.pp),
      ppup: Number(move.ppup ?? 0),
    })),
  };
}
function normalizeNextStarter(pokemon) {
  return {
    personalId: Number(pokemon.personalId ?? pokemon.id),
    species: normalizeId(pokemon.species),
    level: Number(pokemon.level),
    exp: Number(pokemon.exp),
    hp: Number(pokemon.hp),
    maxhp: Number(pokemon.maxhp),
    status: String(pokemon.status ?? ''),
    heldItem: String(pokemon.heldItem ?? ''),
    abilityId: normalizeId(pokemon.ability_id ?? pokemon.ability),
    nature: String(pokemon.nature_id ?? pokemon.nature),
    iv: structuredClone(pokemon.iv),
    ev: structuredClone(pokemon.ev),
    moves: pokemon.moves.map((move) => ({
      id: normalizeId(move.id),
      pp: Number(move.pp),
      ppup: Number(move.ppup ?? 0),
    })),
  };
}

const legacy = createSafariPlayableRuntime();
const next = createFreshRunState({ runId: 'fresh-start-parity', seed: 108 });

assert.equal(next.day, legacy.variables.mapless.day);
assert.equal(next.location, legacy.variables.mapless.location);
assert.equal(next.money, legacy.bag.money);
assert.equal(next.storage.length, 0);
assert.deepEqual(normalizeNextStarter(next.party[0]), normalizeLegacyStarter(legacy.player.party[0]));
console.log('New Core Fresh Start matches canonical Safari startup semantics: ok');
