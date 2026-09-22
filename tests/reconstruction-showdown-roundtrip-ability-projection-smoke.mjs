import assert from 'node:assert/strict';
import { projectMaplessPokemonToShowdown } from '../src-next/core/battle/showdown-roundtrip.js';

const base = {
  id: 'hero',
  species: 'Pikachu',
  level: 12,
  hp: 23,
  maxhp: 35,
  status: '',
  heldItem: '',
  moves: [{ id: 'thunderbolt', pp: 4, maxpp: 15 }],
};

const explicit = projectMaplessPokemonToShowdown({ ...base, ability: 'Static' });
assert.equal(explicit.ability, 'Static', 'persistent ability must survive the Mapless -> Showdown round-trip projection');

const unspecified = projectMaplessPokemonToShowdown(base);
assert.equal(Object.hasOwn(unspecified, 'ability'), false, 'missing persistent ability must remain unspecified so Showdown stays authoritative');

console.log('reconstruction Showdown round-trip ability projection smoke: ok');
