import assert from 'node:assert/strict';
import {
  PUBLISHED_CANONICAL_BATTLE_UI,
  canonicalBattleUiCandidates,
  canonicalBattleUiResolutionState,
} from '../runtime/canonical-battle-ui-sources.js';

const expected = new Map([
  ['overlay_hp.png', {
    canonicalGitBlobSha: '7064a0ca0dc20a7fd91c4f155af93d95b58c8280',
    canonicalSha256: '087d8f80277526e7814a965dfdc27c61312f5e29a1bd5632bfea8e280d2b72b5',
    bytes: 120,
  }],
  ['icon_statuses.png', {
    canonicalGitBlobSha: 'b3e204c5d53a6d17a556a8602f516ea4db2bbfff',
    canonicalSha256: 'f1220f895c686dc8601916769be7853960a44f0efdccbd4b1ec429906dd33fa0',
    bytes: 756,
  }],
]);

for (const [name, metadata] of expected) {
  const published = PUBLISHED_CANONICAL_BATTLE_UI[name];
  assert.ok(published, `${name} should be registered as a published canonical asset`);
  assert.deepEqual(published, metadata);
  assert.deepEqual(canonicalBattleUiCandidates(name), [`assets/canonical-battle-ui/${name}`]);
  const state = canonicalBattleUiResolutionState(name);
  assert.equal(state.status, 'eligible');
  assert.equal(state.published, published);
}

console.log('canonical HP/status assets smoke: ok');
