import { builtinModules } from 'node:module';
import { resolve, join } from 'node:path';
import { inspectPinnedShowdownSource } from './prepare-showdown-browser-source.mjs';

const NODE_BUILTINS = new Set(builtinModules.flatMap(name => [name, `node:${name}`]));

export function createShowdownBrowserBuildPlan(upstreamDir, outputDir = 'vendor/showdown/browser') {
  const source = inspectPinnedShowdownSource(upstreamDir);
  const root = resolve(upstreamDir);
  const outdir = resolve(outputDir);
  return Object.freeze({
    source,
    cwd: root,
    entry: join(root, source.entry),
    outfile: join(outdir, 'battle-engine.js'),
    metafile: join(outdir, 'battle-engine.meta.json'),
    esbuildArgs: Object.freeze([
      join(root, source.entry),
      '--bundle',
      '--format=esm',
      '--platform=browser',
      '--target=safari16',
      '--tree-shaking=true',
      `--outfile=${join(outdir, 'battle-engine.js')}`,
      '--metafile=meta.json',
    ]),
  });
}

export function assertBrowserSafeShowdownMetafile(metafile) {
  if (!metafile || typeof metafile !== 'object' || !metafile.inputs) {
    throw new Error('Showdown browser build metafile is missing inputs');
  }
  const forbidden = new Set();
  for (const input of Object.values(metafile.inputs)) {
    for (const imported of input?.imports || []) {
      if (NODE_BUILTINS.has(imported.path)) forbidden.add(imported.path);
    }
  }
  if (forbidden.size) {
    throw new Error(`Showdown browser artifact retains Node builtins: ${[...forbidden].sort().join(', ')}`);
  }
  return true;
}

export function summarizeShowdownBrowserClosure(metafile) {
  assertBrowserSafeShowdownMetafile(metafile);
  const inputs = Object.keys(metafile.inputs).sort();
  return Object.freeze({ inputCount: inputs.length, inputs });
}
