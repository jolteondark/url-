import { loadShowdownBrowserArtifact, REQUIRED_SHOWDOWN_REVISION } from '../core/battle/showdown-browser-artifact.js';

export const SHOWDOWN_BROWSER_PUBLICATION_FORMAT = 'mapless-showdown-browser-v1';
export const REQUIRED_PKMN_PS_REVISION = '4fec8877c83d102528929100b9c45a3a1cc160d3';

function validateManifest(manifest) {
  if (!manifest || manifest.format !== SHOWDOWN_BROWSER_PUBLICATION_FORMAT) throw new Error('Showdown browser publication manifest format mismatch');
  if (manifest.showdownRevision !== REQUIRED_SHOWDOWN_REVISION) throw new Error('Showdown browser publication mechanics revision mismatch');
  if (manifest.extractorRevision !== REQUIRED_PKMN_PS_REVISION) throw new Error('Showdown browser publication extractor revision mismatch');
  if (manifest.moduleFormat !== 'esm' || manifest.target !== 'safari16') throw new Error('Showdown browser publication target mismatch');
  if (typeof manifest.entry !== 'string' || !manifest.entry || /(^|\/)\.\.($|\/)/.test(manifest.entry) || manifest.entry.startsWith('/')) {
    throw new Error('Showdown browser publication entry is unsafe');
  }
  if (!/^[a-f0-9]{64}$/.test(String(manifest.entrySha256 ?? ''))) throw new Error('Showdown browser publication SHA-256 is invalid');
  return manifest;
}

async function sha256Hex(bytes, subtle = globalThis.crypto?.subtle) {
  if (!subtle || typeof subtle.digest !== 'function') throw new Error('WebCrypto SHA-256 is required for Showdown browser artifact verification');
  const digest = await subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function loadPublishedShowdownBrowserArtifact({
  manifestUrl = './vendor/showdown/browser/manifest.json',
  fetcher = globalThis.fetch?.bind(globalThis),
  importer = (specifier) => import(specifier),
  subtle = globalThis.crypto?.subtle,
} = {}) {
  if (typeof fetcher !== 'function') throw new Error('fetch is required to load the Showdown browser publication');
  const manifestResponse = await fetcher(manifestUrl, { cache: 'no-store' });
  if (!manifestResponse?.ok) throw new Error(`Showdown browser publication manifest fetch failed: ${manifestResponse?.status ?? 'unknown'}`);
  const manifest = validateManifest(await manifestResponse.json());
  const entryUrl = new URL(manifest.entry, new URL(manifestUrl, globalThis.location?.href ?? 'http://localhost/')).href;
  const versionedEntry = `${entryUrl}${entryUrl.includes('?') ? '&' : '?'}sha256=${manifest.entrySha256}`;
  const entryResponse = await fetcher(versionedEntry, { cache: 'force-cache' });
  if (!entryResponse?.ok) throw new Error(`Showdown browser bundle fetch failed: ${entryResponse?.status ?? 'unknown'}`);
  const bytes = await entryResponse.arrayBuffer();
  const actual = await sha256Hex(bytes, subtle);
  if (actual !== manifest.entrySha256) throw new Error('Showdown browser bundle SHA-256 mismatch');
  const showdown = await loadShowdownBrowserArtifact({
    showdownRevision: manifest.showdownRevision,
    esmEntry: versionedEntry,
  }, { importer });
  return Object.freeze({ showdown, manifest: Object.freeze({ ...manifest }), entryUrl: versionedEntry });
}
