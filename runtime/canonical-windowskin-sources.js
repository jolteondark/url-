const CANONICAL_WINDOWSKINS = Object.freeze({
  '001-Blue01.png': Object.freeze({
    sourcePath: 'Graphics/Windowskins/001-Blue01.png',
    bytes: 6851,
    gitBlobSha: '7ad3c18f4d43d62e4956dc14d69d2be2a0e195ac',
    sha256: 'b0b462fbce20032a050ac4cc2be23ec9b7de6866669f1bcc8c283467ccf45198',
  }),
});

const PUBLISHED_EXACT = new Set(['001-Blue01.png']);

export const MAPLESS_WINDOWSKIN_CANONICAL_RELEASE = Object.freeze({
  release: 'source-v0.9.108',
  archiveSha256: '58324a607ac1cd9566eb19ee3bfd0c049d6d33ce15247d773df74cbe9cc3a446',
  splitGraphicsSha256: '2257ab3e4c42ce599932ed39577ade101d2e1e24afdbc0d6e5c03b609dcaa79a',
});

export function canonicalWindowskinMetadata(name) {
  return CANONICAL_WINDOWSKINS[String(name ?? '').trim()] ?? null;
}

export function canonicalWindowskinLocalPath(name) {
  const safe = String(name ?? '').trim();
  if (!CANONICAL_WINDOWSKINS[safe]) return null;
  return `assets/canonical-windowskins/${safe}`;
}

export function canonicalWindowskinCandidates(name) {
  const safe = String(name ?? '').trim();
  if (!PUBLISHED_EXACT.has(safe)) return [];
  const local = canonicalWindowskinLocalPath(safe);
  return local ? [local] : [];
}

export function canonicalWindowskinResolutionState(name) {
  const safe = String(name ?? '').trim();
  const metadata = canonicalWindowskinMetadata(safe);
  if (!metadata) return Object.freeze({ status: 'blocked', name: safe, reason: 'unknown_canonical_windowskin' });
  if (!PUBLISHED_EXACT.has(safe)) return Object.freeze({ status: 'blocked', name: safe, reason: 'canonical_binary_not_published', ...metadata });
  return Object.freeze({ status: 'eligible', name: safe, path: canonicalWindowskinLocalPath(safe), ...metadata });
}

export { CANONICAL_WINDOWSKINS };
