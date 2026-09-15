const SAFE_SEGMENT = /^[A-Za-z0-9._@+-]+$/;

function normalizeBasePath(basePath) {
  if (typeof basePath !== 'string') throw new TypeError('basePath must be a string');
  const trimmed = basePath.replace(/\/+$/, '');
  if (!trimmed) return '';
  return trimmed.startsWith('/') || /^https?:\/\//.test(trimmed) ? trimmed : `/${trimmed}`;
}

function validateIdentifier(identifier) {
  if (typeof identifier !== 'string' || identifier.length === 0) {
    throw new TypeError('asset identifier must be a non-empty string');
  }
  if (!SAFE_SEGMENT.test(identifier)) {
    throw new Error(`unsafe asset identifier: ${identifier}`);
  }
  return identifier;
}

function validateRelativePath(path) {
  if (typeof path !== 'string' || path.length === 0) throw new TypeError('asset path must be a non-empty string');
  if (path.startsWith('/') || path.includes('\\')) throw new Error(`asset path must be repository-relative: ${path}`);
  const segments = path.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..' || !SAFE_SEGMENT.test(segment))) {
    throw new Error(`unsafe asset path: ${path}`);
  }
  return path;
}

export function createSharedAssetResolver({ basePath = '', manifest = {} } = {}) {
  const base = normalizeBasePath(basePath);
  const entries = new Map();
  const metrics = { resolves: 0, hits: 0, misses: 0 };

  for (const [identifier, path] of Object.entries(manifest)) {
    entries.set(validateIdentifier(identifier), validateRelativePath(path));
  }

  function resolve(identifier) {
    const key = validateIdentifier(identifier);
    metrics.resolves += 1;
    const path = entries.get(key);
    if (!path) {
      metrics.misses += 1;
      return null;
    }
    metrics.hits += 1;
    return {
      identifier: key,
      path,
      url: base ? `${base}/${path}` : path,
    };
  }

  function snapshot() {
    return Object.freeze({
      entries: entries.size,
      resolves: metrics.resolves,
      hits: metrics.hits,
      misses: metrics.misses,
    });
  }

  return Object.freeze({ resolve, snapshot });
}
