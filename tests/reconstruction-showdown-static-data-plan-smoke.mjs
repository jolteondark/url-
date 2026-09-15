import assert from 'node:assert/strict';
import { assertShowdownStaticDataManifest, REQUIRED_BASE_DATA } from '../scripts/showdown-browser-static-data-plan.mjs';

const manifest = {
  strategy: 'build-time-static-imports',
  baseData: REQUIRED_BASE_DATA.map(file => `/pinned/data/${file}`),
  modsRoot: '/pinned/data/mods',
};
assert.equal(assertShowdownStaticDataManifest(manifest), true);
assert.throws(
  () => assertShowdownStaticDataManifest({ ...manifest, strategy: 'browser-fs-polyfill' }),
  /build-time static imports/
);
assert.throws(
  () => assertShowdownStaticDataManifest({ ...manifest, baseData: manifest.baseData.slice(1) }),
  /missing required base data tables/
);
assert.throws(
  () => assertShowdownStaticDataManifest({ ...manifest, modsRoot: '' }),
  /missing modsRoot/
);

console.log('reconstruction Showdown static data plan smoke: ok');
