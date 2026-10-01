import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectExtractedShowdownArtifact } from './showdown-browser-artifact-contract.mjs';
import { assertBrowserSafeShowdownMetafile } from './showdown-browser-build-plan.mjs';
import { createBrowserExtractionPlan, PKMN_PS_REVISION } from './showdown-browser-extractor-plan.mjs';
import { SHOWDOWN_REVISION } from '../src-next/core/battle/showdown-pin.js';

export const SHOWDOWN_BROWSER_PUBLICATION_FORMAT = 'mapless-showdown-browser-v1';

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function relativePosix(from, to) {
  return relative(from, to).split('\\').join('/');
}

export function createShowdownBrowserPublicationPlan(extractorDir, outputDir = 'vendor/showdown/browser') {
  const extraction = createBrowserExtractionPlan(extractorDir);
  const artifact = inspectExtractedShowdownArtifact(extractorDir);
  const root = extraction.extractor.root;
  const esbuild = join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'esbuild.cmd' : 'esbuild');
  if (!existsSync(esbuild)) throw new Error('pinned pkmn/ps esbuild binary is missing');
  const outdir = resolve(outputDir);
  const outfile = join(outdir, 'battle-engine.js');
  const metafile = join(outdir, 'battle-engine.meta.json');
  const manifest = join(outdir, 'manifest.json');
  return Object.freeze({
    extraction,
    artifact,
    esbuild,
    outdir,
    outfile,
    metafile,
    manifest,
    args: Object.freeze([
      artifact.esmEntry,
      '--bundle',
      '--format=esm',
      '--platform=browser',
      '--target=safari16',
      '--tree-shaking=true',
      '--legal-comments=linked',
      `--outfile=${outfile}`,
      `--metafile=${metafile}`,
    ]),
  });
}

export function publishPinnedShowdownBrowserArtifact(extractorDir, outputDir = 'vendor/showdown/browser', options = {}) {
  const before = createShowdownBrowserPublicationPlan(extractorDir, outputDir);
  mkdirSync(before.outdir, { recursive: true });
  const runner = options.execFileSync ?? execFileSync;
  runner(before.esbuild, [...before.args], {
    cwd: before.extraction.extractor.root,
    stdio: options.stdio ?? 'inherit',
    encoding: 'utf8',
  });
  if (!existsSync(before.outfile) || !existsSync(before.metafile)) {
    throw new Error('Showdown browser publication did not produce bundle + metafile');
  }
  const meta = JSON.parse(readFileSync(before.metafile, 'utf8'));
  assertBrowserSafeShowdownMetafile(meta);

  const after = createBrowserExtractionPlan(extractorDir);
  if (after.extractor.revision !== before.extraction.extractor.revision || after.showdown.revision !== before.extraction.showdown.revision) {
    throw new Error('Showdown browser publication changed a pinned source revision');
  }
  if (after.extractor.revision !== PKMN_PS_REVISION || after.showdown.revision !== SHOWDOWN_REVISION) {
    throw new Error('Showdown browser publication source pin mismatch');
  }

  const manifest = Object.freeze({
    format: SHOWDOWN_BROWSER_PUBLICATION_FORMAT,
    extractorRepository: 'pkmn/ps',
    extractorRevision: after.extractor.revision,
    showdownRepository: 'smogon/pokemon-showdown',
    showdownRevision: after.showdown.revision,
    entry: relativePosix(before.outdir, before.outfile),
    entrySha256: sha256(before.outfile),
    metafile: relativePosix(before.outdir, before.metafile),
    target: 'safari16',
    moduleFormat: 'esm',
    mechanicsAuthority: 'smogon/pokemon-showdown',
  });
  writeFileSync(before.manifest, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifest;
}

const invoked = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const extractorDir = process.argv[2];
  const outputDir = process.argv[3] ?? 'vendor/showdown/browser';
  if (!extractorDir) {
    console.error('usage: node scripts/publish-pinned-showdown-browser-artifact.mjs <built-pinned-pkmn-ps-checkout> [output-dir]');
    process.exit(2);
  }
  const manifest = publishPinnedShowdownBrowserArtifact(extractorDir, outputDir);
  console.log(JSON.stringify(manifest, null, 2));
}
