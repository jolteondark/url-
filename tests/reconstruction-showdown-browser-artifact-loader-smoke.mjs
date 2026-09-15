import assert from 'node:assert/strict';
import {
  loadShowdownBrowserArtifact,
  REQUIRED_SHOWDOWN_REVISION,
} from '../src-next/core/battle/showdown-browser-artifact.js';

class FakeBattle {}
const artifact = {
  showdownRevision: REQUIRED_SHOWDOWN_REVISION,
  esmEntry: 'file:///tmp/pinned-showdown/build/esm/sim/index.mjs',
};

let imported = null;
const loaded = await loadShowdownBrowserArtifact(artifact, {
  importer: async (specifier) => {
    imported = specifier;
    return { Battle: FakeBattle };
  },
});
assert.equal(imported, artifact.esmEntry);
assert.equal(loaded.revision, REQUIRED_SHOWDOWN_REVISION);
assert.equal(loaded.Battle, FakeBattle);
assert.equal(Object.isFrozen(loaded), true);

await assert.rejects(
  loadShowdownBrowserArtifact({ ...artifact, showdownRevision: 'floating-master' }, {
    importer: async () => ({ Battle: FakeBattle }),
  }),
  /revision mismatch/,
);

await assert.rejects(
  loadShowdownBrowserArtifact(artifact, { importer: async () => ({}) }),
  /does not export Battle/,
);

console.log('reconstruction-showdown-browser-artifact-loader-smoke: ok');
