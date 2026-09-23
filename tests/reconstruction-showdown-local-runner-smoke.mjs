import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../scripts/run-pinned-showdown-roundtrip-local.mjs', import.meta.url), 'utf8');

assert.match(source, /PKMN_PS_REVISION/);
assert.match(source, /SHOWDOWN_REVISION/);
assert.match(source, /\['checkout', '--detach', PKMN_PS_REVISION\]/);
assert.match(source, /\['checkout', '--detach', SHOWDOWN_REVISION\]/);
assert.match(source, /\['import', '--debug'\]/, 'extractor import must not update vendored submodules remotely');
assert.match(source, /reconstruction-showdown-real-request-differential\.mjs/);
assert.match(source, /reconstruction-showdown-real-sleep-roundtrip\.mjs/);
assert.match(source, /reconstruction-showdown-real-roundtrip\.mjs/);
assert.doesNotMatch(source, /actions\/|workflow|runner|artifact/i, 'local validation path must not depend on GitHub Actions infrastructure');

console.log(JSON.stringify({ ok: true, boundary: 'local-pinned-showdown-roundtrip-runner' }));
