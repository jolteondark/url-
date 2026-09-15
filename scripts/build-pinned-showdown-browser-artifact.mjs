import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { inspectExtractedShowdownArtifact } from './showdown-browser-artifact-contract.mjs';
import { createBrowserExtractionPlan } from './showdown-browser-extractor-plan.mjs';

/**
 * Builds the already-extracted @pkmn/sim sources from the exact pinned pkmn/ps
 * checkout. This deliberately does NOT execute pkmn/ps's `import` script: that
 * script synchronizes upstream submodules and could move the mechanics source
 * away from the revision Mapless has pinned.
 *
 * Dependencies must already be installed in the pinned extractor checkout.
 */
export function buildPinnedShowdownBrowserArtifact(extractorDir, options = {}) {
  const root = resolve(extractorDir);
  const before = createBrowserExtractionPlan(root);
  const runner = options.execFileSync || execFileSync;

  runner('npm', ['run', 'build'], {
    cwd: resolve(root, 'sim'),
    encoding: 'utf8',
    stdio: options.stdio || 'inherit',
  });

  // Re-check both git pins after the build so a tooling side effect cannot
  // silently change the mechanics authority beneath the generated artifact.
  const after = createBrowserExtractionPlan(root);
  if (before.extractor.revision !== after.extractor.revision || before.showdown.revision !== after.showdown.revision) {
    throw new Error('Pinned Showdown browser build changed a validated source revision');
  }

  return inspectExtractedShowdownArtifact(root);
}

if (process.argv[1] && import.meta.url === new URL(`file://${resolve(process.argv[1])}`).href) {
  const extractorDir = process.argv[2];
  if (!extractorDir) {
    console.error('usage: node scripts/build-pinned-showdown-browser-artifact.mjs <pinned-pkmn-ps-checkout>');
    process.exitCode = 2;
  } else {
    const artifact = buildPinnedShowdownBrowserArtifact(extractorDir);
    console.log(JSON.stringify(artifact, null, 2));
  }
}
