import assert from 'node:assert/strict';
import {
  canonicalBattleUiCandidates,
  canonicalBattleUiResolutionState,
} from '../runtime/canonical-battle-ui-sources.js';

assert.deepEqual(
  canonicalBattleUiCandidates('definitely_not_published.png'),
  [],
  'unpublished Battle UI assets without an exact mirror must not generate a local 404 candidate',
);
assert.deepEqual(
  canonicalBattleUiResolutionState('definitely_not_published.png'),
  {
    status: 'blocked',
    name: 'definitely_not_published.png',
    reason: 'unpublished-no-exact-mirror',
    mirror: false,
    published: null,
  },
);

const mirrored = canonicalBattleUiCandidates('cursor_target.png');
assert.equal(mirrored.length, 1);
assert.match(mirrored[0], /^https:\/\/raw\.githubusercontent\.com\//);
assert.equal(canonicalBattleUiResolutionState('cursor_target.png').status, 'eligible');

assert.deepEqual(
  canonicalBattleUiCandidates('overlay_hp.png'),
  ['assets/canonical-battle-ui/overlay_hp.png'],
);
assert.equal(canonicalBattleUiResolutionState('overlay_hp.png').status, 'eligible');

console.log('canonical battle UI fail-closed smoke: ok');
