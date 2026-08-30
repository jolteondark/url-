const CANONICAL_WINDOWSKINS = Object.freeze({
  '001-Blue01.png': Object.freeze({
    sourcePath: 'Graphics/Windowskins/001-Blue01.png',
    bytes: 6851,
    sha256: 'b0b462fbce20032a050ac4cc2be23ec9b7de6866669f1bcc8c283467ccf45198',
    reason: 'canonical_binary_verified_not_published',
  }),
});

export const MAPLESS_WINDOWSKIN_CANONICAL_RELEASE = Object.freeze({
  release: 'source-v0.9.108',
  archiveSha256: '58324a607ac1cd9566eb19ee3bfd0c049d6d33ce15247d773df74cbe9cc3a446',
  splitGraphicsSha256: '2257ab3e4c42ce599932ed39577ade101d2e1e24afdbc0d6e5c03b609dcaa79a',
});

export function canonicalWindowskinMetadata(name) {
  return CANONICAL_WINDOWSKINS[String(name ?? '').trim()] ?? null;
}

export function canonicalWindowskinCandidates(name) {
  const safe = String(name ?? '').trim();
  return CANONICAL_WINDOWSKINS[safe] ? [] : [];
}

export function canonicalWindowskinResolutionState(name) {
  const safe = String(name ?? '').trim();
  const metadata = canonicalWindowskinMetadata(safe);
  if (!metadata) return Object.freeze({ status: 'blocked', name: safe, reason: 'unknown_canonical_windowskin' });
  return Object.freeze({ status: 'blocked', name: safe, ...metadata });
}

export { CANONICAL_WINDOWSKINS };
