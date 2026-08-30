import assert from 'node:assert/strict';
import {
  MAPLESS_WINDOWSKIN_CANONICAL_RELEASE,
  canonicalWindowskinCandidates,
  canonicalWindowskinLocalPath,
  canonicalWindowskinMetadata,
  canonicalWindowskinResolutionState,
} from '../runtime/canonical-windowskin-sources.js';

assert.equal(MAPLESS_WINDOWSKIN_CANONICAL_RELEASE.release, 'source-v0.9.108');
assert.equal(MAPLESS_WINDOWSKIN_CANONICAL_RELEASE.archiveSha256, '58324a607ac1cd9566eb19ee3bfd0c049d6d33ce15247d773df74cbe9cc3a446');
assert.equal(MAPLESS_WINDOWSKIN_CANONICAL_RELEASE.splitGraphicsSha256, '2257ab3e4c42ce599932ed39577ade101d2e1e24afdbc0d6e5c03b609dcaa79a');

const meta = canonicalWindowskinMetadata('001-Blue01.png');
assert.ok(meta);
assert.equal(meta.sourcePath, 'Graphics/Windowskins/001-Blue01.png');
assert.equal(meta.bytes, 6851);
assert.equal(meta.gitBlobSha, '7ad3c18f4d43d62e4956dc14d69d2be2a0e195ac');
assert.equal(meta.sha256, 'b0b462fbce20032a050ac4cc2be23ec9b7de6866669f1bcc8c283467ccf45198');
assert.equal(canonicalWindowskinLocalPath('001-Blue01.png'), 'assets/canonical-windowskins/001-Blue01.png');
assert.deepEqual(canonicalWindowskinCandidates('001-Blue01.png'), ['assets/canonical-windowskins/001-Blue01.png']);
assert.equal(canonicalWindowskinResolutionState('001-Blue01.png').status, 'eligible');
assert.equal(canonicalWindowskinResolutionState('001-Blue01.png').path, 'assets/canonical-windowskins/001-Blue01.png');
assert.deepEqual(canonicalWindowskinCandidates('001-blue01.png'), []);
assert.equal(canonicalWindowskinLocalPath('001-blue01.png'), null);
assert.equal(canonicalWindowskinResolutionState('001-blue01.png').reason, 'unknown_canonical_windowskin');

console.log('canonical windowskin source smoke: PASS');
