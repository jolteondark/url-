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
const offline = process.env.MAPLESS_SHOWDOWN_OFFLINE === '1';

function run(command, args, cwd = root) {
  console.log(`+ ${command} ${args.join(' ')}`);
  execFileSync(command, args, { cwd, stdio: 'inherit' });
}

function output(command, args, cwd) {
  return execFileSync(command, args, { cwd, encoding: 'utf8' }).trim();
}

function hasCommit(cwd, revision) {
  try {
    execFileSync('git', ['cat-file', '-e', `${revision}^{commit}`], { cwd, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function ensureCommit(cwd, revision, label) {
  if (!hasCommit(cwd, revision)) {
    if (offline) throw new Error(`${label} ${revision} is not available in the cached checkout`);
    run('git', ['fetch', 'origin', revision], cwd);
  }
  run('git', ['checkout', '--detach', revision], cwd);
}

try {
  if (!existsSync(join(workDir, '.git'))) {
    if (offline) throw new Error('offline mode requires an existing pkmn/ps checkout');
    run('git', ['clone', '--no-checkout', 'https://github.com/pkmn/ps.git', workDir]);
  }
  ensureCommit(workDir, PKMN_PS_REVISION, 'pkmn/ps extractor revision');

  const showdownDir = join(workDir, 'vendor', 'pokemon-showdown');
  if (!existsSync(join(showdownDir, '.git'))) {
    if (offline) throw new Error('offline mode requires an initialized vendor/pokemon-showdown checkout');
    run('git', ['submodule', 'update', '--init', '--recursive'], workDir);
  }

  // The extractor revision predates the Mapless mechanics pin. Keep the extractor
  // itself pinned, but deliberately move only its Showdown vendor checkout to the
  // exact Mapless SHOWDOWN_REVISION before regenerating @pkmn/sim. Running import
  // with --debug is essential: normal import updates submodules from remote.
  ensureCommit(showdownDir, SHOWDOWN_REVISION, 'Pokemon Showdown mechanics revision');
  if (output('git', ['rev-parse', 'HEAD'], workDir) !== PKMN_PS_REVISION) {
    throw new Error('pkmn/ps extractor moved away from its pinned revision');
  }
  if (output('git', ['rev-parse', 'HEAD'], showdownDir) !== SHOWDOWN_REVISION) {
    throw new Error('Pokemon Showdown vendor moved away from the Mapless mechanics pin');
  }

  if (offline) {
    if (!existsSync(join(workDir, 'node_modules'))) {
      throw new Error('offline mode requires cached pkmn/ps node_modules');
    }
  } else {
    run('npm', ['install'], workDir);
  }
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
