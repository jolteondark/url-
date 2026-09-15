import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createBrowserExtractionPlan } from './showdown-browser-extractor-plan.mjs';
import { SHOWDOWN_REVISION } from '../src-next/core/battle/showdown-pin.js';

export const SHOWDOWN_BROWSER_PACKAGE = '@pkmn/sim';
export const SHOWDOWN_BROWSER_ENTRY = 'build/esm/sim/index.mjs';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/**
 * Validates the concrete artifact produced by the pinned pkmn/ps extractor.
 * This is build-time/tooling only: New Core receives an ESM simulator surface,
 * never a filesystem-backed Showdown checkout or a second mechanics owner.
 */
export function inspectExtractedShowdownArtifact(extractorDir) {
  const plan = createBrowserExtractionPlan(extractorDir);
  const packageRoot = resolve(plan.extractor.root, 'sim');
  const packageJsonPath = join(packageRoot, 'package.json');
  const entryPath = join(packageRoot, SHOWDOWN_BROWSER_ENTRY);

  if (!existsSync(packageJsonPath)) throw new Error('Extracted @pkmn/sim package.json is missing');
  const pkg = readJson(packageJsonPath);
  if (pkg.name !== SHOWDOWN_BROWSER_PACKAGE) {
    throw new Error(`Unexpected extracted simulator package: ${pkg.name || '<missing>'}`);
  }
  if (pkg.license !== 'MIT') {
    throw new Error(`Unexpected extracted simulator license: ${pkg.license || '<missing>'}`);
  }
  if (pkg.module !== SHOWDOWN_BROWSER_ENTRY) {
    throw new Error(`Unexpected extracted simulator ESM entry: ${pkg.module || '<missing>'}`);
  }
  if (!existsSync(entryPath)) {
    throw new Error(`Extracted simulator ESM entry is missing: ${SHOWDOWN_BROWSER_ENTRY}`);
  }

  return Object.freeze({
    packageName: SHOWDOWN_BROWSER_PACKAGE,
    entryPath,
    revision: SHOWDOWN_REVISION,
    license: 'MIT',
    extractorRevision: plan.extractor.revision,
    policy: Object.freeze({
      mechanicsAuthority: plan.policy.mechanicsAuthority,
      browserTarget: true,
      esmOnlyAtRuntime: true,
      requireDifferentialFixture: true,
      allowLegacyFallback: false,
    }),
  });
}
