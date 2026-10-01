import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PKMN_PS_REVISION } from './showdown-browser-extractor-plan.mjs';
import { SHOWDOWN_BROWSER_ENTRY } from './showdown-browser-artifact-contract.mjs';
import { SHOWDOWN_REVISION } from '../src-next/core/battle/showdown-pin.js';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const requestedDir = process.argv[2] ? resolve(process.argv[2]) : null;
const workDir = requestedDir ?? mkdtempSync(join(tmpdir(), 'mapless-pkmn-ps-'));
const keep = Boolean(requestedDir) || process.env.MAPLESS_KEEP_SHOWDOWN_EXTRACTOR === '1';
const pkmnPsBundle = process.env.MAPLESS_PKMN_PS_BUNDLE
  ? resolve(process.env.MAPLESS_PKMN_PS_BUNDLE)
  : null;
const showdownBundle = process.env.MAPLESS_SHOWDOWN_BUNDLE
  ? resolve(process.env.MAPLESS_SHOWDOWN_BUNDLE)
  : null;
const npmCache = process.env.MAPLESS_NPM_CACHE
  ? resolve(process.env.MAPLESS_NPM_CACHE)
  : null;
const offline = process.env.MAPLESS_SHOWDOWN_OFFLINE === '1'
  || pkmnPsBundle !== null
  || showdownBundle !== null;

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

function requireBundle(bundlePath, label) {
  if (!bundlePath) {
    throw new Error(`offline mode requires ${label}; set the corresponding bundle environment variable`);
  }
  if (!existsSync(bundlePath)) throw new Error(`${label} does not exist: ${bundlePath}`);
  return bundlePath;
}

function ensureCommit(cwd, revision, label, bundlePath = null) {
  if (!hasCommit(cwd, revision)) {
    if (offline) {
      run('git', ['fetch', requireBundle(bundlePath, `${label} bundle`), 'refs/heads/*:refs/remotes/mapless-bundle/*'], cwd);
    } else {
      run('git', ['fetch', 'origin', revision], cwd);
    }
  }
  if (!hasCommit(cwd, revision)) {
    throw new Error(`${label} ${revision} is not available after fetch`);
  }
  run('git', ['checkout', '--detach', revision], cwd);
}

function assertPinnedRevisions(showdownDir) {
  if (output('git', ['rev-parse', 'HEAD'], workDir) !== PKMN_PS_REVISION) {
    throw new Error('pkmn/ps extractor moved away from its pinned revision');
  }
  if (output('git', ['rev-parse', 'HEAD'], showdownDir) !== SHOWDOWN_REVISION) {
    throw new Error('Pokemon Showdown vendor moved away from the Mapless mechanics pin');
  }
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function exactArtifactStamp(stampPath, builtEntry) {
  if (!existsSync(stampPath) || !existsSync(builtEntry)) return false;
  try {
    const stamp = JSON.parse(readFileSync(stampPath, 'utf8'));
    return stamp.extractorRevision === PKMN_PS_REVISION
      && stamp.showdownRevision === SHOWDOWN_REVISION
      && typeof stamp.entrySha256 === 'string'
      && stamp.entrySha256 === sha256(builtEntry);
  } catch {
    return false;
  }
}

function extractPinnedSimulator(showdownDir, artifactStamp) {
  // These exact pins straddle supplemental extractor-only additions. Neither
  // input below belongs to the simulator mechanics executed by the harnesses.
  // Keep the pinned import/build scripts and every Showdown source byte intact.
  run('git', ['diff', '--exit-code', 'HEAD', '--', 'import', 'build'], workDir);
  // npm refreshes package-lock's Node engine metadata; it is not engine source.
  run('git', ['diff', '--exit-code', 'HEAD', '--', '.', ':!package-lock.json'], showdownDir);
  const unsupportedMod = join(workDir, 'mods', 'src', 'championsregma');
  if (existsSync(join(showdownDir, 'data', 'mods', 'championsregma'))) {
    throw new Error('Unexpected championsregma data at the exact Showdown pin');
  }
  const optionalData = join(showdownDir, 'data', 'random-battles', 'gen9', 'sets-megainvasion.json');
  const teamsSource = readFileSync(join(showdownDir, 'data', 'random-battles', 'gen9', 'teams.ts'), 'utf8');
  if (existsSync(optionalData) || /sets-megainvasion\.json|randomMegaInvasionSets/.test(teamsSource)) {
    throw new Error('Cannot supply an unused optional extractor input without changing pinned random-team mechanics');
  }
  const stage = mkdtempSync(join(tmpdir(), 'mapless-extractor-inputs-'));
  const stagedMod = join(stage, 'championsregma');
  let modMoved = false;
  let dataCreated = false;
  try {
    // import enumerates files under sim; a previous generated provenance stamp
    // is not an upstream source input and must be invalidated before rebuilding.
    if (existsSync(artifactStamp)) unlinkSync(artifactStamp);
    for (const kind of ['cjs', 'esm']) {
      const temporaryConfig = join(workDir, 'sim', `tsconfig.${kind}.json`);
      if (!existsSync(temporaryConfig)) continue;
      const generated = JSON.parse(readFileSync(temporaryConfig, 'utf8'));
      if (generated.compilerOptions?.outDir !== `build/${kind}`) throw new Error(`Unexpected temporary build config: ${temporaryConfig}`);
      unlinkSync(temporaryConfig);
    }
    if (existsSync(unsupportedMod)) {
      renameSync(unsupportedMod, stagedMod);
      modMoved = true;
    }
    writeFileSync(optionalData, '{}\n');
    dataCreated = true;
    run('node', ['import', '--debug'], workDir);
  } finally {
    if (dataCreated) unlinkSync(optionalData);
    if (modMoved) renameSync(stagedMod, unsupportedMod);
    rmSync(stage, { recursive: true });
  }
  // Newer extractor declarations reject older pinned tags/rule descriptions.
  // Emit the unmodified engine TS as JS; do not claim upstream type-check PASS.
  const configPath = join(workDir, 'sim', 'tsconfig.json');
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  config.compilerOptions.noCheck = true;
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
}

try {
  if (!existsSync(join(workDir, '.git'))) {
    if (offline) {
      run('git', ['clone', '--no-checkout', requireBundle(pkmnPsBundle, 'pkmn/ps bundle'), workDir]);
    } else {
      run('git', ['clone', '--no-checkout', 'https://github.com/pkmn/ps.git', workDir]);
    }
  }
  ensureCommit(workDir, PKMN_PS_REVISION, 'pkmn/ps extractor revision', pkmnPsBundle);

  const showdownDir = join(workDir, 'vendor', 'pokemon-showdown');
  if (!existsSync(join(showdownDir, '.git'))) {
    if (offline) {
      mkdirSync(join(workDir, 'vendor'), { recursive: true });
      run('git', ['clone', '--no-checkout', requireBundle(showdownBundle, 'Pokemon Showdown bundle'), showdownDir]);
    } else {
      run('git', ['submodule', 'update', '--init', '--recursive'], workDir);
    }
  }

  // Keep the extractor itself pinned, but move only its Showdown vendor to the
  // exact Mapless SHOWDOWN_REVISION before regenerating @pkmn/sim. Running import
  // with --debug is essential: normal import updates submodules from remote.
  ensureCommit(showdownDir, SHOWDOWN_REVISION, 'Pokemon Showdown mechanics revision', showdownBundle);
  assertPinnedRevisions(showdownDir);

  const builtEntry = join(workDir, 'sim', SHOWDOWN_BROWSER_ENTRY);
  const artifactStamp = join(workDir, 'sim', '.mapless-showdown-build.json');
  if (offline && exactArtifactStamp(artifactStamp, builtEntry)) {
    // Reuse only an artifact whose build-time provenance records both exact pins
    // and whose current bytes still match the digest recorded at build time.
    console.log(`Using cached pinned Showdown artifact: ${builtEntry}`);
  } else {
    if (offline) {
      if (existsSync(builtEntry) && !exactArtifactStamp(artifactStamp, builtEntry)) {
        throw new Error('offline cached Showdown artifact has missing/stale/tampered build provenance; rebuild it once from the exact pins before reuse');
      }
      if (!existsSync(join(workDir, 'node_modules'))) {
        if (!npmCache || !existsSync(npmCache)) {
          throw new Error('offline mode requires cached pkmn/ps node_modules or MAPLESS_NPM_CACHE when the built simulator artifact is missing');
        }
        run('npm', ['install', '--ignore-scripts', '--offline', '--cache', npmCache], workDir);
      }
    } else {
      run('npm', ['install', '--ignore-scripts'], workDir);
    }
    // Install only simulator/import dependencies. Upstream postinstall also
    // installs server/client/integration packages and native SQLite databases.
    const dependencyArgs = ['install', '--ignore-scripts', ...(offline ? ['--offline'] : []), ...(npmCache ? ['--cache', npmCache] : [])];
    run('npm', dependencyArgs, join(workDir, 'sim'));
    run('npm', dependencyArgs, showdownDir);
    extractPinnedSimulator(showdownDir, artifactStamp);
    run('npm', ['run', 'build'], join(workDir, 'sim'));
    if (!existsSync(builtEntry)) throw new Error(`pinned Showdown build did not produce ${SHOWDOWN_BROWSER_ENTRY}`);
    // Build/import are allowed to generate files, but the provenance stamp must
    // describe the revisions that actually survived the build, not merely the
    // revisions observed before it started.
    assertPinnedRevisions(showdownDir);
    writeFileSync(artifactStamp, `${JSON.stringify({
      extractorRevision: PKMN_PS_REVISION,
      showdownRevision: SHOWDOWN_REVISION,
      entrySha256: sha256(builtEntry),
      extractorScriptSha256: sha256(join(workDir, 'import')),
      battleSourceSha256: sha256(join(showdownDir, 'sim', 'battle.ts')),
      pokemonSourceSha256: sha256(join(showdownDir, 'sim', 'pokemon.ts')),
      typeCheck: false,
    }, null, 2)}\n`);
  }

  const harnesses = [
    'tests/reconstruction-showdown-real-request-differential.mjs',
    'tests/reconstruction-showdown-real-sleep-roundtrip.mjs',
    'tests/reconstruction-showdown-real-roundtrip.mjs',
    'tests/reconstruction-showdown-real-base-moves-persistence.mjs',
    'tests/reconstruction-showdown-real-fainted-bench-bookkeeping.mjs',
    'tests/reconstruction-showdown-real-p1-vertical.mjs',
  'tests/reconstruction-showdown-real-individual-stats.mjs',
  ];
  for (const harness of harnesses) run(process.execPath, [harness, workDir], root);
  console.log(`Pinned Showdown local round-trip suite PASS: ${SHOWDOWN_REVISION}`);
} finally {
  if (!keep && !requestedDir) rmSync(workDir, { recursive: true, force: true });
  else console.log(`Kept extractor checkout: ${workDir}`);
}
