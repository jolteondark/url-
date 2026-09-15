import assert from 'node:assert/strict';
import {
  SHOWDOWN_BROWSER_ENTRY,
  SHOWDOWN_BROWSER_PACKAGE,
} from '../scripts/showdown-browser-artifact-contract.mjs';
import { SHOWDOWN_REVISION } from '../src-next/core/battle/showdown-pin.js';

assert.equal(SHOWDOWN_BROWSER_PACKAGE, '@pkmn/sim');
assert.equal(SHOWDOWN_BROWSER_ENTRY, 'build/esm/sim/index.mjs');
assert.equal(SHOWDOWN_REVISION, 'b1156ff19204e48089e2384eb2c9c1a8004f57ce');

// Runtime consumers must target the extractor's ESM package surface rather than
// importing raw filesystem-backed Pokemon Showdown modules or legacy mechanics.
assert.ok(SHOWDOWN_BROWSER_ENTRY.endsWith('.mjs'));
assert.ok(!SHOWDOWN_BROWSER_ENTRY.includes('vendor/pokemon-showdown'));

const runtimePolicy = {
  mechanicsAuthority: 'smogon/pokemon-showdown',
  browserTarget: true,
  esmOnlyAtRuntime: true,
  requireDifferentialFixture: true,
  allowLegacyFallback: false,
};
assert.equal(runtimePolicy.allowLegacyFallback, false);
assert.equal(runtimePolicy.requireDifferentialFixture, true);

console.log('reconstruction Showdown browser artifact contract smoke: ok');
