import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../scripts/build-pinned-showdown-browser-artifact.mjs', import.meta.url), 'utf8');

// The execution boundary must build the already-extracted simulator package;
// it must never run the extractor import step, which can sync floating upstream
// submodules and invalidate the pinned mechanics source.
assert.match(source, /runner\('npm', \['run', 'build'\]/);
assert.match(source, /resolve\(root, 'sim'\)/);
assert.doesNotMatch(source, /runner\([^\n]*['"]import['"]/);
assert.doesNotMatch(source, /execFileSync\([^\n]*['"]import['"]/);

// Pins are checked both before and after generation, and the concrete ESM
// artifact is validated before anything can be handed to New Core runtime.
const planChecks = source.match(/createBrowserExtractionPlan\(root\)/g) || [];
assert.equal(planChecks.length, 2);
assert.match(source, /inspectExtractedShowdownArtifact\(root\)/);
assert.match(source, /changed a validated source revision/);

console.log('reconstruction Showdown browser build execution smoke: ok');
