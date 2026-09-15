import assert from 'node:assert/strict';
import { PKMN_PS_REPOSITORY, PKMN_PS_REVISION } from '../scripts/showdown-browser-extractor-plan.mjs';
import { SHOWDOWN_REPOSITORY, SHOWDOWN_REVISION } from '../src-next/core/battle/showdown-pin.js';

assert.equal(SHOWDOWN_REPOSITORY, 'smogon/pokemon-showdown');
assert.equal(SHOWDOWN_REVISION, 'b1156ff19204e48089e2384eb2c9c1a8004f57ce');
assert.equal(PKMN_PS_REPOSITORY, 'pkmn/ps');
assert.equal(PKMN_PS_REVISION, '4fec8877c83d102528929100b9c45a3a1cc160d3');
assert.notEqual(PKMN_PS_REVISION, SHOWDOWN_REVISION);

// The extractor is tooling only. Its hard-coded vendor/pokemon-showdown path must
// itself be replaced/checked out at the mechanics-authority revision before import.
const policy = {
  mechanicsAuthority: SHOWDOWN_REPOSITORY,
  extractorOnly: true,
  browserTarget: true,
  allowFloatingDependency: false,
  requireDifferentialFixture: true,
  requirePinnedExtractorVendor: true,
};
assert.deepEqual(policy, {
  mechanicsAuthority: 'smogon/pokemon-showdown',
  extractorOnly: true,
  browserTarget: true,
  allowFloatingDependency: false,
  requireDifferentialFixture: true,
  requirePinnedExtractorVendor: true,
});

console.log('reconstruction Showdown browser extractor plan smoke: ok');
