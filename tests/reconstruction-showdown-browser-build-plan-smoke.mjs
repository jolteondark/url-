import assert from 'node:assert/strict';
import { assertBrowserSafeShowdownMetafile, summarizeShowdownBrowserClosure } from '../scripts/showdown-browser-build-plan.mjs';

const safe = {
  inputs: {
    'sim/battle.ts': { imports: [{ path: 'sim/battle-actions.ts' }] },
    'sim/battle-actions.ts': { imports: [] },
  },
};
assert.equal(assertBrowserSafeShowdownMetafile(safe), true);
assert.deepEqual(summarizeShowdownBrowserClosure(safe), {
  inputCount: 2,
  inputs: ['sim/battle-actions.ts', 'sim/battle.ts'],
});

for (const path of ['fs', 'node:fs', 'path', 'node:path']) {
  assert.throws(
    () => assertBrowserSafeShowdownMetafile({ inputs: { 'sim/dex.ts': { imports: [{ path }] } } }),
    /retains Node builtins/
  );
}
assert.throws(() => assertBrowserSafeShowdownMetafile(null), /metafile is missing inputs/);

console.log('reconstruction Showdown browser build plan smoke: ok');
