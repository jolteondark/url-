import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

import {
  canonicalTrainerAssetUrl,
  canonicalTrainerPublishedPath,
} from '../runtime/canonical-trainer-sources.js';

const consumer = await fs.readFile(new URL('../trainer-battle-canonical-sprite.js', import.meta.url), 'utf8');

assert.match(consumer, /canonicalTrainerAssetUrl/);
assert.doesNotMatch(consumer, /canonicalTrainerPublishedPath/);
assert.doesNotMatch(consumer, /new URL\s*\(\s*publishedPath/);

assert.equal(
  canonicalTrainerPublishedPath('LEADER_Brock.png'),
  'assets/canonical-trainers/LEADER_Brock.png',
);

const brockUrl = canonicalTrainerAssetUrl('LEADER_Brock.png');
assert.ok(brockUrl, 'published canonical trainer should resolve to a URL');
assert.match(brockUrl, /\/assets\/canonical-trainers\/LEADER_Brock\.png$/);
assert.equal(canonicalTrainerAssetUrl('leader_brock.png'), null, 'case mismatch must fail closed');
assert.equal(canonicalTrainerAssetUrl('../LEADER_Brock.png'), null, 'path traversal must fail closed');
assert.equal(canonicalTrainerAssetUrl('NOT_PUBLISHED.png'), null, 'unknown trainer must fail closed');

console.log('trainer sprite shared URL adapter smoke: PASS');
