import assert from 'node:assert/strict';
import { RubyMT19937Random } from '../runtime/ruby-mt19937-random.js';
import { safariWoundedGeneralSpeciesPoolV108 } from '../runtime/safari-wounded-general-species-pool-v108.js';

const pool = safariWoundedGeneralSpeciesPoolV108();
assert.equal(pool.length, 875);
assert.deepEqual(pool.slice(0, 5), ['BULBASAUR','IVYSAUR','VENUSAUR','CHARMANDER','CHARMELEON']);
assert.deepEqual(pool.slice(-5), ['GHOLDENGO','DIPPLIN','POLTCHAGEIST','SINISTCHA','ARCHALUDON','HYDRAPPLE'].slice(-5));

for (const [seed, expectedIndex, expectedSpecies] of [
  [0, 684, 'BEWEAR'],
  [1, 37, 'NINETALES'],
  [54321, 593, 'BUNNELBY'],
  [2147483647, 874, 'HYDRAPPLE'],
  [4294967295, 419, 'TOXICROAK'],
]) {
  const rng = new RubyMT19937Random(seed >>> 0);
  const index = rng.randInt(pool.length);
  assert.equal(index, expectedIndex);
  assert.equal(pool[index], expectedSpecies);
}

console.log('safari-m0393-wounded-general-pool-smoke: ok');
