import assert from 'node:assert/strict';
import {
  loadShowdownBrowserArtifact,
  REQUIRED_SHOWDOWN_REVISION,
} from '../src-next/core/battle/showdown-browser-artifact.js';

class FakeBattle {}
class FakeBattleStream {}
const FakeBattleStreams = {
  BattleStream: FakeBattleStream,
  getPlayerStreams(stream) {
    return { omniscient: stream, p1: {}, p2: {} };
  },
};
const FakeTeams = { pack: (team) => JSON.stringify(team) };
const FakeDex = { formats: {} };
const artifact = {
  showdownRevision: REQUIRED_SHOWDOWN_REVISION,
  esmEntry: 'file:///tmp/pinned-showdown/build/esm/sim/index.mjs',
};

let imported = null;
const importer = async (specifier) => {
  imported = specifier;
  return {
    Battle: FakeBattle,
    BattleStreams: FakeBattleStreams,
    Teams: FakeTeams,
    Dex: FakeDex,
  };
};
const loaded = await loadShowdownBrowserArtifact(artifact, { importer });
assert.equal(imported, artifact.esmEntry);
assert.equal(loaded.revision, REQUIRED_SHOWDOWN_REVISION);
assert.equal(loaded.Battle, FakeBattle);
assert.equal(loaded.BattleStreams, FakeBattleStreams);
assert.equal(loaded.Teams, FakeTeams);
assert.equal(loaded.Dex, FakeDex);
assert.equal(Object.isFrozen(loaded), true);

await assert.rejects(
  loadShowdownBrowserArtifact({ ...artifact, showdownRevision: 'floating-master' }, { importer }),
  /revision mismatch/,
);

for (const missing of ['Battle', 'BattleStreams', 'Teams', 'Dex']) {
  await assert.rejects(
    loadShowdownBrowserArtifact(artifact, {
      importer: async () => ({
        Battle: FakeBattle,
        BattleStreams: FakeBattleStreams,
        Teams: FakeTeams,
        Dex: FakeDex,
        [missing]: undefined,
      }),
    }),
    new RegExp(`does not export ${missing}`),
  );
}

await assert.rejects(
  loadShowdownBrowserArtifact(artifact, {
    importer: async () => ({
      Battle: FakeBattle,
      BattleStreams: { BattleStream: FakeBattleStream },
      Teams: FakeTeams,
      Dex: FakeDex,
    }),
  }),
  /BattleStreams surface is incomplete/,
);

await assert.rejects(
  loadShowdownBrowserArtifact(artifact, {
    importer: async () => ({
      Battle: FakeBattle,
      BattleStreams: FakeBattleStreams,
      Teams: {},
      Dex: FakeDex,
    }),
  }),
  /Teams surface is incomplete/,
);

console.log('reconstruction-showdown-browser-artifact-loader-smoke: ok');
