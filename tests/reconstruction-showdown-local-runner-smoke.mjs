import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../scripts/run-pinned-showdown-roundtrip-local.mjs', import.meta.url), 'utf8');

assert.match(source, /PKMN_PS_REVISION/);
assert.match(source, /SHOWDOWN_REVISION/);
assert.match(source, /ensureCommit\(workDir, PKMN_PS_REVISION, 'pkmn\/ps extractor revision'\)/,
  'local runner must detach the extractor checkout at the pinned pkmn/ps revision');
assert.match(source, /ensureCommit\(showdownDir, SHOWDOWN_REVISION, 'Pokemon Showdown mechanics revision'\)/,
  'local runner must detach only vendor\/pokemon-showdown at the Mapless mechanics pin');
assert.match(source, /git', \['checkout', '--detach', revision\]/,
  'pin helper must use detached checkout semantics');
assert.match(source, /\['import', '--debug'\]/, 'extractor import must not update vendored submodules remotely');
assert.match(source, /MAPLESS_SHOWDOWN_OFFLINE/,
  'cached local validation must expose an explicit fail-closed offline mode');
assert.match(source, /offline mode requires an existing pkmn\/ps checkout/);
assert.match(source, /offline mode requires an initialized vendor\/pokemon-showdown checkout/);
assert.match(source, /offline mode requires cached pkmn\/ps node_modules/);
assert.match(source, /reconstruction-showdown-real-request-differential\.mjs/);
assert.match(source, /reconstruction-showdown-real-sleep-roundtrip\.mjs/);
assert.match(source, /reconstruction-showdown-real-roundtrip\.mjs/);
assert.doesNotMatch(source, /actions\/|workflow|github-hosted|pages deployment/i,
  'local validation path must not depend on forbidden hosted validation/deployment infrastructure');

console.log(JSON.stringify({ ok: true, boundary: 'local-pinned-showdown-roundtrip-runner' }));
