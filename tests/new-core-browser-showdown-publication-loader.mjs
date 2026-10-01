import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import {
  loadPublishedShowdownBrowserArtifact,
  REQUIRED_PKMN_PS_REVISION,
  SHOWDOWN_BROWSER_PUBLICATION_FORMAT,
} from '../src-next/platform/browser-showdown-artifact.js';
import { REQUIRED_SHOWDOWN_REVISION } from '../src-next/core/battle/showdown-browser-artifact.js';

const bytes = new TextEncoder().encode('export const fixture = true;');
const hash = createHash('sha256').update(bytes).digest('hex');
const manifest = {
  format: SHOWDOWN_BROWSER_PUBLICATION_FORMAT,
  extractorRepository: 'pkmn/ps',
  extractorRevision: REQUIRED_PKMN_PS_REVISION,
  showdownRepository: 'smogon/pokemon-showdown',
  showdownRevision: REQUIRED_SHOWDOWN_REVISION,
  entry: 'battle-engine.js',
  entrySha256: hash,
  metafile: 'battle-engine.meta.json',
  target: 'safari16',
  moduleFormat: 'esm',
  mechanicsAuthority: 'smogon/pokemon-showdown',
};

const calls = [];
const fetcher = async (url, options) => {
  calls.push({ url: String(url), cache: options?.cache });
  if (String(url).endsWith('/manifest.json')) {
    return { ok: true, status: 200, async json() { return structuredClone(manifest); } };
  }
  assert.ok(String(url).includes('/battle-engine.js?sha256='));
  return { ok: true, status: 200, async arrayBuffer() { return bytes.slice().buffer; } };
};
let imported = null;
const loaded = await loadPublishedShowdownBrowserArtifact({
  manifestUrl: 'https://example.test/vendor/showdown/browser/manifest.json',
  fetcher,
  subtle: webcrypto.subtle,
  importer: async (specifier) => {
    imported = specifier;
    return {
      Battle: class Battle {},
      BattleStreams: { BattleStream: class BattleStream {}, getPlayerStreams() {} },
      Teams: { pack() { return ''; } },
      Dex: {},
    };
  },
});
assert.equal(loaded.showdown.revision, REQUIRED_SHOWDOWN_REVISION);
assert.equal(loaded.manifest.entrySha256, hash);
assert.equal(imported, loaded.entryUrl);
assert.match(imported, new RegExp(`sha256=${hash}$`));
assert.deepEqual(calls.map((call) => call.cache), ['no-store', 'force-cache']);

const badFetcher = async (url) => String(url).endsWith('/manifest.json')
  ? { ok: true, async json() { return { ...manifest, entrySha256: '0'.repeat(64) }; } }
  : { ok: true, async arrayBuffer() { return bytes.slice().buffer; } };
await assert.rejects(
  () => loadPublishedShowdownBrowserArtifact({
    manifestUrl: 'https://example.test/vendor/showdown/browser/manifest.json',
    fetcher: badFetcher,
    subtle: webcrypto.subtle,
    importer: async () => { throw new Error('must not import tampered bundle'); },
  }),
  /SHA-256 mismatch/
);

await assert.rejects(
  () => loadPublishedShowdownBrowserArtifact({
    manifestUrl: 'https://example.test/vendor/showdown/browser/manifest.json',
    fetcher: async () => ({ ok: true, async json() { return { ...manifest, entry: '../escape.js' }; } }),
    subtle: webcrypto.subtle,
  }),
  /entry is unsafe/
);

console.log('published Showdown browser artifact loader: ok');
