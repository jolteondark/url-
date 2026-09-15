import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { SHOWDOWN_REVISION } from '../src-next/core/battle/showdown-pin.js';

export const PKMN_PS_REPOSITORY = 'pkmn/ps';
export const PKMN_PS_REVISION = '4fec8877c83d102528929100b9c45a3a1cc160d3';

function gitHead(root) {
  return execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
}

export function inspectBrowserExtractor(extractorDir) {
  const root = resolve(extractorDir);
  const revision = gitHead(root);
  if (revision !== PKMN_PS_REVISION) {
    throw new Error(`pkmn/ps extractor revision mismatch: expected ${PKMN_PS_REVISION}, got ${revision}`);
  }
  const importScript = join(root, 'import');
  if (!existsSync(importScript)) throw new Error('Pinned pkmn/ps extractor is missing import script');
  const source = readFileSync(importScript, 'utf8');
  if (!source.includes("const ps = path.resolve(__dirname, 'vendor/pokemon-showdown')")) {
    throw new Error('Pinned pkmn/ps extractor no longer exposes the expected Pokemon Showdown vendor boundary');
  }
  if (!source.includes('@pkmn/sim')) {
    throw new Error('Pinned pkmn/ps extractor no longer identifies @pkmn/sim generation');
  }
  return Object.freeze({ repository: PKMN_PS_REPOSITORY, revision: PKMN_PS_REVISION, root });
}

export function inspectExtractorShowdownVendor(extractorDir) {
  const root = resolve(extractorDir, 'vendor/pokemon-showdown');
  if (!existsSync(root)) {
    throw new Error('Pinned pkmn/ps extractor is missing vendor/pokemon-showdown');
  }
  const revision = gitHead(root);
  if (revision !== SHOWDOWN_REVISION) {
    throw new Error(`Extractor Showdown vendor revision mismatch: expected ${SHOWDOWN_REVISION}, got ${revision}`);
  }
  return Object.freeze({ revision: SHOWDOWN_REVISION, root });
}

export function createBrowserExtractionPlan(extractorDir) {
  const extractor = inspectBrowserExtractor(extractorDir);
  // pkmn/ps's import script reads this exact vendor path. Validating an unrelated
  // Showdown checkout would not constrain the mechanics actually extracted.
  const showdown = inspectExtractorShowdownVendor(extractor.root);
  return Object.freeze({
    extractor,
    showdown,
    policy: Object.freeze({
      mechanicsAuthority: 'smogon/pokemon-showdown',
      extractorOnly: true,
      browserTarget: true,
      allowFloatingDependency: false,
      requireDifferentialFixture: true,
      requirePinnedExtractorVendor: true,
    }),
  });
}
