import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PKMN_PS_REVISION } from './showdown-browser-extractor-plan.mjs';
import { SHOWDOWN_REVISION } from '../src-next/core/battle/showdown-pin.js';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const requestedDir = process.argv[2] ? resolve(process.argv[2]) : null;
const workDir = requestedDir ?? mkdtempSync(join(tmpdir(), 'mapless-pkmn-ps-'));
const keep = Boolean(requestedDir) || process.env.MAPLESS_KEEP_SHOWDOWN_EXTRACTOR === '1';

function run(command, args, cwd = root) {
  console.log(`+ ${command} ${args.join(' ')}`);
  execFileSync(command, args, { cwd, stdio: 'inherit' });
}

function output(command, args, cwd) {
  return execFileSync(command, args, { cwd, encoding: 'utf8' }).trim();
}

try {
  if (!existsSync(join(workDir, '.git'))) {
    run('git', ['clone', '--no-checkout', 'https://github.com/pkmn/ps.git', workDir]);
  }
  run('git', ['fetch', 'origin', PKMN_PS_REVISION], workDir);
  run('git', ['checkout', '--detach', PKMN_PS_REVISION], workDir);
  run('git', ['submodule', 'update', '--init', '--recursive'], workDir);

  // The extractor revision predates the Mapless mechanics pin. Keep the extractor
  // itself pinned, but deliberately move only its Showdown vendor checkout to the
  // exact Mapless SHOWDOWN_REVISION before regenerating @pkmn/sim. Running import
  // with --debug is essential: normal import updates submodules from remote.
  const showdownDir = join(workDir, 'vendor', 'pokemon-showdown');
  run('git', ['fetch', 'origin', SHOWDOWN_REVISION], showdownDir);
  run('git', ['checkout', '--detach', SHOWDOWN_REVISION], showdownDir);
  if (output('git', ['rev-parse', 'HEAD'], workDir) !== PKMN_PS_REVISION) {
    throw new Error('pkmn/ps extractor moved away from its pinned revision');
  }
  if (output('git', ['rev-parse', 'HEAD'], showdownDir) !== SHOWDOWN_REVISION) {
    throw new Error('Pokemon Showdown vendor moved away from the Mapless mechanics pin');
  }

  run('npm', ['install'], workDir);
  run('node', ['import', '--debug'], workDir);
  run('npm', ['run', 'build'], join(workDir, 'sim'));

  const harnesses = [
    'tests/reconstruction-showdown-real-request-differential.mjs',
    'tests/reconstruction-showdown-real-sleep-roundtrip.mjs',
    'tests/reconstruction-showdown-real-roundtrip.mjs',
  ];
  for (const harness of harnesses) run(process.execPath, [harness, workDir], root);
  console.log(`Pinned Showdown local round-trip suite PASS: ${SHOWDOWN_REVISION}`);
} finally {
  if (!keep && !requestedDir) rmSync(workDir, { recursive: true, force: true });
  else console.log(`Kept extractor checkout: ${workDir}`);
}
