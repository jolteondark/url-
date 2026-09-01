const CANONICAL_TRAINERS = Object.freeze({
  'LEADER_Brock.png': Object.freeze({ bytes: 2177, gitBlobSha: 'edbf7b46fc4a6951926b56e3bde84b455b79aeb0', sha256: '811b5a3e4f10349aa1c8e670356a7fc185d859ad60ec520a679a394ec1719447' }),
  'LEADER_Misty.png': Object.freeze({ bytes: 2240, gitBlobSha: '00b4516e98a9770fa9c81f4f023182319a496f0c', sha256: '5b5df1635ffd49b9c4a6229c4bfb25463e9d835cd9711767394a6e1c2d6eb057' }),
  'LEADER_Surge.png': Object.freeze({ bytes: 2398, gitBlobSha: '01cd7e4aae29a3f1c7191117523372c91b0dcaae', sha256: '6247c37d5ea0f64d74bd857af01680ee00d939baf94c88f8824888446cc8c2fe' }),
  'LEADER_Erika.png': Object.freeze({ bytes: 2115, gitBlobSha: 'a280b97343b1290d0495d761261f938da0b8b5a0', sha256: 'c578e106766876b914ecec66257c9b70ebefd8773114422d132c69505a4eb2d8' }),
  'LEADER_Koga.png': Object.freeze({ bytes: 2186, gitBlobSha: '2fdfdf0a86034e6a4048e7cc00a67cff0b384f12', sha256: '1aebea435f974cf934fbc1540b68e4ff0e824998245fae37e5f65abee9f10243' }),
  'LEADER_Sabrina.png': Object.freeze({ bytes: 2244, gitBlobSha: 'e45e8aabedb1813f6b4826d95c39967913a39196', sha256: 'd00006caec6a64f8dad5ebfb053f01574c5237e6283fe29562b8709b8b624a10' }),
  'LEADER_Blaine.png': Object.freeze({ bytes: 2571, gitBlobSha: '07dfed32a2785913f71c0ceef59d8b9e776cadaa', sha256: '97ca18990b9548b3130fbd5928779a3b2984aafbdad785d028bcd7a06e9b5e8a' }),
  'RIVAL2.png': Object.freeze({ bytes: 2060, gitBlobSha: '965804733fbdf7c865890b814a465bc37a2e45fb', sha256: 'db09772c96436104ecb1f69e967190b8b19ed21763bc66951394dbc93a83abc2' }),
});

const PUBLISHED_EXACT = new Set(Object.keys(CANONICAL_TRAINERS));

export const MAPLESS_TRAINER_CANONICAL_RELEASE = Object.freeze({
  release: 'source-v0.9.108',
  zipSha256: '58324a607ac1cd9566eb19ee3bfd0c049d6d33ce15247d773df74cbe9cc3a446',
  expectedCount: 8,
});

export function canonicalTrainerExpected(name) {
  return CANONICAL_TRAINERS[String(name ?? '').trim()] ?? null;
}

export function canonicalTrainerLocalPath(name) {
  const safe = String(name ?? '').trim();
  if (!CANONICAL_TRAINERS[safe]) return null;
  return `assets/canonical-trainers/${safe}`;
}

// Fail closed: only expose an exact canonical name whose verified payload is published.
export function canonicalTrainerPublishedPath(name) {
  const safe = String(name ?? '').trim();
  if (!PUBLISHED_EXACT.has(safe)) return null;
  return canonicalTrainerLocalPath(safe);
}

export function canonicalTrainerAssetUrl(name, _options = {}) {
  const publishedPath = canonicalTrainerPublishedPath(name);
  if (!publishedPath) return null;
  try {
    return new URL(`../${publishedPath}`, import.meta.url).href;
  } catch {
    return null;
  }
}

export function canonicalTrainerMissingNames() {
  return Object.keys(CANONICAL_TRAINERS).filter((name) => !PUBLISHED_EXACT.has(name));
}

export { CANONICAL_TRAINERS };