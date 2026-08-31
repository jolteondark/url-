import assert from 'node:assert/strict';
import {
  PUBLISHED_CANONICAL_BATTLE_UI,
  canonicalBattleUiCandidates,
  canonicalBattleUiResolutionState,
} from '../runtime/canonical-battle-ui-sources.js';

const expected = new Map([
  ['databox_normal.png', ['fcc043f814f25e8345ac7b51e5f7573d2fa60d6d', 938]],
  ['databox_normal_foe.png', ['5d223b28161ed851ad12602c02058f773d7bec03', 783]],
  ['overlay_message.png', ['aa8257b992a407256968484fc7b35f2e6ab8bb60', 947]],
  ['overlay_fight.png', ['d61ef321964b693e31bca81a34a6fd0dba5e5a60', 1602]],
  ['overlay_lv.png', ['758fccbb3d776f6731fa2f7600aee4913a37d515', 328]],
]);

for (const [name, [canonicalGitBlobSha, bytes]] of expected) {
  const published = PUBLISHED_CANONICAL_BATTLE_UI[name];
  assert.ok(published, `${name} should be registered as a published canonical asset`);
  assert.equal(published.canonicalGitBlobSha, canonicalGitBlobSha);
  assert.equal(published.bytes, bytes);
  assert.deepEqual(canonicalBattleUiCandidates(name), [`assets/canonical-battle-ui/${name}`]);
  const state = canonicalBattleUiResolutionState(name);
  assert.equal(state.status, 'eligible');
  assert.equal(state.published, published);
}

console.log('canonical battle UI published inventory smoke: ok');
