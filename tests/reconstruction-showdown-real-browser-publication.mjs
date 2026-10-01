import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  publishPinnedShowdownBrowserArtifact,
  SHOWDOWN_BROWSER_PUBLICATION_FORMAT,
} from '../scripts/publish-pinned-showdown-browser-artifact.mjs';
import { assertBrowserSafeShowdownMetafile } from '../scripts/showdown-browser-build-plan.mjs';
import { PKMN_PS_REVISION } from '../scripts/showdown-browser-extractor-plan.mjs';
import { SHOWDOWN_REVISION } from '../src-next/core/battle/showdown-pin.js';

const extractorDir = process.argv[2];
if (!extractorDir) {
  console.error('usage: node tests/reconstruction-showdown-real-browser-publication.mjs <built-pinned-pkmn-ps-checkout>');
  process.exit(2);
}
const output = mkdtempSync(join(tmpdir(), 'mapless-showdown-browser-publication-'));
try {
  const manifest = publishPinnedShowdownBrowserArtifact(resolve(extractorDir), output, { stdio: 'pipe' });
  assert.equal(manifest.format, SHOWDOWN_BROWSER_PUBLICATION_FORMAT);
  assert.equal(manifest.extractorRevision, PKMN_PS_REVISION);
  assert.equal(manifest.showdownRevision, SHOWDOWN_REVISION);
  assert.equal(manifest.entry, 'battle-engine.js');
  assert.equal(manifest.moduleFormat, 'esm');
  assert.equal(manifest.target, 'safari16');
  assert.match(manifest.entrySha256, /^[a-f0-9]{64}$/);

  const bundle = join(output, manifest.entry);
  const metafile = join(output, manifest.metafile);
  const manifestFile = join(output, 'manifest.json');
  assert.ok(existsSync(bundle));
  assert.ok(existsSync(metafile));
  assert.ok(existsSync(manifestFile));
  assert.ok(statSync(bundle).size > 1000, 'published browser bundle must be nontrivial');
  assert.equal(createHash('sha256').update(readFileSync(bundle)).digest('hex'), manifest.entrySha256);
  assert.equal(assertBrowserSafeShowdownMetafile(JSON.parse(readFileSync(metafile, 'utf8'))), true);
  assert.deepEqual(JSON.parse(readFileSync(manifestFile, 'utf8')), manifest);
  console.log(JSON.stringify({ ok: true, bytes: statSync(bundle).size, ...manifest }, null, 2));
} finally {
  rmSync(output, { recursive: true, force: true });
}
