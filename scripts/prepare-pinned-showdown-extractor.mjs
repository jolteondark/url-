import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { PKMN_PS_REVISION, createBrowserExtractionPlan } from './showdown-browser-extractor-plan.mjs';
import { SHOWDOWN_REVISION } from '../src-next/core/battle/showdown-pin.js';

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

export function preparePinnedShowdownExtractor(extractorDir) {
  const root = resolve(extractorDir);
  if (!existsSync(join(root, '.git'))) throw new Error('pkmn/ps checkout is required');

  const extractorHead = git(['rev-parse', 'HEAD'], root);
  if (extractorHead !== PKMN_PS_REVISION) {
    throw new Error(`pkmn/ps extractor revision mismatch: expected ${PKMN_PS_REVISION}, got ${extractorHead}`);
  }

  const vendor = join(root, 'vendor/pokemon-showdown');
  if (!existsSync(vendor)) git(['submodule', 'update', '--init', '--', 'vendor/pokemon-showdown'], root);

  git(['fetch', '--depth=1', 'origin', SHOWDOWN_REVISION], vendor);
  git(['checkout', '--detach', SHOWDOWN_REVISION], vendor);

  const plan = createBrowserExtractionPlan(root);
  if (plan.showdown.revision !== SHOWDOWN_REVISION) {
    throw new Error('Prepared extractor did not retain the Mapless Showdown revision');
  }
  return plan;
}

if (process.argv[1] && import.meta.url === new URL(`file://${resolve(process.argv[1])}`).href) {
  const extractorDir = process.argv[2];
  if (!extractorDir) throw new Error('usage: node scripts/prepare-pinned-showdown-extractor.mjs <pkmn-ps-checkout>');
  process.stdout.write(`${JSON.stringify(preparePinnedShowdownExtractor(extractorDir), null, 2)}\n`);
}
