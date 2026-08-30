import assert from 'node:assert/strict';
import {
  PUBLISHED_CANONICAL_BATTLE_UI,
  UNRESOLVED_CANONICAL_BATTLE_UI,
  canonicalBattleUiCandidates,
  canonicalBattleUiLocalPath,
  canonicalBattleUiResolutionState,
} from '../runtime/canonical-battle-ui-sources.js';

const name = 'cursor_command.png';
const published = PUBLISHED_CANONICAL_BATTLE_UI[name];
assert.ok(published);
assert.equal(published.canonicalGitBlobSha, 'c73f69b29b93355a605d7c0d2aa611e36a007020');
assert.equal(published.canonicalSha256, '614722591ecfa667be586e0c9df985c5b4bcbac2b8f3c3b2beed1fc4c7094d39');
assert.equal(published.bytes, 8456);
assert.equal(UNRESOLVED_CANONICAL_BATTLE_UI[name], undefined);
assert.equal(canonicalBattleUiLocalPath(name), 'assets/canonical-battle-ui/cursor_command.png');
assert.deepEqual(canonicalBattleUiCandidates(name), ['assets/canonical-battle-ui/cursor_command.png']);
assert.equal(canonicalBattleUiResolutionState(name).status, 'eligible');
assert.equal(canonicalBattleUiResolutionState(name).published, published);
assert.equal(canonicalBattleUiLocalPath('../cursor_command.png'), null);
assert.deepEqual(canonicalBattleUiCandidates('../cursor_command.png'), []);

console.log('canonical battle UI cursor smoke: ok');
