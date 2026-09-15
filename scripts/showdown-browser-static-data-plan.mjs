import { resolve, join } from 'node:path';
import { inspectPinnedShowdownSource } from './prepare-showdown-browser-source.mjs';

// The pinned Showdown Dex loads these tables through filesystem access at runtime.
// A Safari artifact must replace that I/O at build time, not polyfill fs/path in-browser.
const REQUIRED_BASE_DATA = Object.freeze([
  'abilities.ts',
  'conditions.ts',
  'items.ts',
  'moves.ts',
  'pokedex.ts',
  'scripts.ts',
  'typechart.ts',
]);

export function createShowdownStaticDataPlan(upstreamDir) {
  const source = inspectPinnedShowdownSource(upstreamDir);
  const root = resolve(upstreamDir);
  const dataRoot = join(root, source.dataRoot);
  return Object.freeze({
    source,
    dataRoot,
    baseData: Object.freeze(REQUIRED_BASE_DATA.map(file => join(dataRoot, file))),
    // Mod inheritance is mechanics state, so generated browser data must preserve
    // the pinned upstream data/mods tree rather than flattening to ad-hoc Mapless tables.
    modsRoot: join(dataRoot, 'mods'),
    strategy: 'build-time-static-imports',
  });
}

export function assertShowdownStaticDataManifest(manifest) {
  if (!manifest || manifest.strategy !== 'build-time-static-imports') {
    throw new Error('Showdown browser data manifest must use build-time static imports');
  }
  if (!Array.isArray(manifest.baseData) || manifest.baseData.length !== REQUIRED_BASE_DATA.length) {
    throw new Error('Showdown browser data manifest is missing required base data tables');
  }
  if (!manifest.modsRoot) throw new Error('Showdown browser data manifest is missing modsRoot');
  return true;
}

export { REQUIRED_BASE_DATA };
