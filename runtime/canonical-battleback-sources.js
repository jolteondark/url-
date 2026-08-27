const CANONICAL_BATTLEBACKS = Object.freeze({
  'field_base1.png': Object.freeze({ group: 'base1', bytes: 26898, gitBlobSha: '4f2f3b67504fadb334ffdac00590ff84dd3cd6ce', sha256: '444f5fda35313d23d8f96c23b2549c71bdbeead0f9f2bfbad4c6bbf96bddc765' }),
  'field_eve_base1.png': Object.freeze({ group: 'base1', bytes: 26898, gitBlobSha: '4f2f3b67504fadb334ffdac00590ff84dd3cd6ce', sha256: '444f5fda35313d23d8f96c23b2549c71bdbeead0f9f2bfbad4c6bbf96bddc765' }),
  'field_night_base1.png': Object.freeze({ group: 'base1', bytes: 26898, gitBlobSha: '4f2f3b67504fadb334ffdac00590ff84dd3cd6ce', sha256: '444f5fda35313d23d8f96c23b2549c71bdbeead0f9f2bfbad4c6bbf96bddc765' }),
  'field_base0.png': Object.freeze({ group: 'base0', bytes: 30334, gitBlobSha: 'd49d80f21f3eb3db8f55109252d34e43af3f2525', sha256: 'f216d773396364bfe2c8b4c1f1f60d06512c55b2804c40fa84ce3afffb801faa' }),
  'field_eve_base0.png': Object.freeze({ group: 'base0', bytes: 30334, gitBlobSha: 'd49d80f21f3eb3db8f55109252d34e43af3f2525', sha256: 'f216d773396364bfe2c8b4c1f1f60d06512c55b2804c40fa84ce3afffb801faa' }),
  'field_night_base0.png': Object.freeze({ group: 'base0', bytes: 30334, gitBlobSha: 'd49d80f21f3eb3db8f55109252d34e43af3f2525', sha256: 'f216d773396364bfe2c8b4c1f1f60d06512c55b2804c40fa84ce3afffb801faa' }),
  'field_bg.png': Object.freeze({ group: 'bg', bytes: 278338, gitBlobSha: '7287790e48fbc334fd26c7d9a3dca74ee081da28', sha256: '19298d589f25945e2279304107d7482c5fc0aadcea02e47fe24897a60e7e514f' }),
  'field_eve_bg.png': Object.freeze({ group: 'bg', bytes: 278338, gitBlobSha: '7287790e48fbc334fd26c7d9a3dca74ee081da28', sha256: '19298d589f25945e2279304107d7482c5fc0aadcea02e47fe24897a60e7e514f' }),
  'field_night_bg.png': Object.freeze({ group: 'bg', bytes: 278338, gitBlobSha: '7287790e48fbc334fd26c7d9a3dca74ee081da28', sha256: '19298d589f25945e2279304107d7482c5fc0aadcea02e47fe24897a60e7e514f' }),
  'field_message.png': Object.freeze({ group: 'message', bytes: 230, gitBlobSha: 'e71553144f9f833ec2c858362ce7f01aee1ea99a', sha256: 'bd2e8b22581cc8d37c04827d6bf691e5219d5acd19e3d0bd15540badd602f148' }),
});

const PUBLISHED_EXACT = new Set(['field_message.png']);

export const MAPLESS_BATTLEBACK_CANONICAL_RELEASE = Object.freeze({
  release: 'source-v0.9.108',
  zipSha256: '58324a607ac1cd9566eb19ee3bfd0c049d6d33ce15247d773df74cbe9cc3a446',
  expectedCount: 10,
  uniquePayloadCount: 4,
});

export function canonicalBattlebackExpected(name) {
  return CANONICAL_BATTLEBACKS[String(name ?? '').trim()] ?? null;
}

export function canonicalBattlebackLocalPath(name) {
  const safe = String(name ?? '').trim();
  if (!CANONICAL_BATTLEBACKS[safe]) return null;
  return `assets/canonical-battlebacks/${safe}`;
}

// Fail closed: never expose a local URL until that exact canonical payload is published.
export function canonicalBattlebackPublishedPath(name) {
  const safe = String(name ?? '').trim();
  if (!PUBLISHED_EXACT.has(safe)) return null;
  return canonicalBattlebackLocalPath(safe);
}

export function canonicalBattlebackGroup(name) {
  return canonicalBattlebackExpected(name)?.group ?? null;
}

export function canonicalBattlebackAliases(name) {
  const group = canonicalBattlebackGroup(name);
  if (!group) return [];
  return Object.keys(CANONICAL_BATTLEBACKS).filter((candidate) => CANONICAL_BATTLEBACKS[candidate].group === group);
}

export function canonicalBattlebackMissingNames() {
  return Object.keys(CANONICAL_BATTLEBACKS).filter((name) => !PUBLISHED_EXACT.has(name));
}

export { CANONICAL_BATTLEBACKS };
