import assert from 'node:assert/strict';
import {
  CANONICAL_TRAINERS,
  MAPLESS_TRAINER_CANONICAL_RELEASE,
  canonicalTrainerExpected,
  canonicalTrainerLocalPath,
  canonicalTrainerPublishedPath,
  canonicalTrainerMissingNames,
} from '../runtime/canonical-trainer-sources.js';

const EXPECTED = [
  'LEADER_Brock.png',
  'LEADER_Misty.png',
  'LEADER_Surge.png',
  'LEADER_Erika.png',
  'LEADER_Koga.png',
  'LEADER_Sabrina.png',
  'LEADER_Blaine.png',
  'RIVAL2.png',
];

assert.equal(MAPLESS_TRAINER_CANONICAL_RELEASE.release, 'source-v0.9.108');
assert.equal(MAPLESS_TRAINER_CANONICAL_RELEASE.expectedCount, 8);
assert.deepEqual(Object.keys(CANONICAL_TRAINERS), EXPECTED);
assert.deepEqual(canonicalTrainerMissingNames(), EXPECTED);

for (const name of EXPECTED) {
  const source = canonicalTrainerExpected(name);
  assert.ok(source);
  assert.match(source.sha256, /^[0-9a-f]{64}$/);
  assert.match(source.gitBlobSha, /^[0-9a-f]{40}$/);
  assert.ok(source.bytes > 0);
  assert.equal(canonicalTrainerLocalPath(name), `assets/canonical-trainers/${name}`);
  assert.equal(canonicalTrainerPublishedPath(name), null);
}

assert.equal(canonicalTrainerExpected('leader_brock.png'), null);
assert.equal(canonicalTrainerLocalPath('../RIVAL2.png'), null);
assert.equal(canonicalTrainerPublishedPath('RIVAL2.png'), null);

console.log('canonical trainer source smoke: ok');
