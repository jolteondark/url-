function defaultClock() {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

function freezeRecord(record) {
  return Object.freeze({ ...record });
}

export function createInstrumentedAssetLoader({
  resolver,
  load,
  decode = null,
  clock = defaultClock,
} = {}) {
  if (!resolver || typeof resolver.resolve !== 'function') throw new TypeError('resolver.resolve is required');
  if (typeof load !== 'function') throw new TypeError('load must be a function');
  if (decode !== null && typeof decode !== 'function') throw new TypeError('decode must be a function or null');
  if (typeof clock !== 'function') throw new TypeError('clock must be a function');

  const cache = new Map();
  const metrics = {
    requests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    loadFailures: 0,
    decodeFailures: 0,
    totalLoadMs: 0,
    maxLoadMs: 0,
    totalDecodeMs: 0,
    maxDecodeMs: 0,
  };

  async function loadAsset(identifier) {
    metrics.requests += 1;
    const resolved = resolver.resolve(identifier);
    if (!resolved) return null;

    const cached = cache.get(resolved.url);
    if (cached) {
      metrics.cacheHits += 1;
      return cached;
    }
    metrics.cacheMisses += 1;

    const promise = (async () => {
      const loadStarted = clock();
      let asset;
      try {
        asset = await load(resolved.url, resolved);
      } catch (error) {
        metrics.loadFailures += 1;
        throw error;
      } finally {
        const duration = Math.max(0, clock() - loadStarted);
        metrics.totalLoadMs += duration;
        metrics.maxLoadMs = Math.max(metrics.maxLoadMs, duration);
      }

      if (decode) {
        const decodeStarted = clock();
        try {
          await decode(asset, resolved);
        } catch (error) {
          metrics.decodeFailures += 1;
          throw error;
        } finally {
          const duration = Math.max(0, clock() - decodeStarted);
          metrics.totalDecodeMs += duration;
          metrics.maxDecodeMs = Math.max(metrics.maxDecodeMs, duration);
        }
      }
      return freezeRecord({ ...resolved, asset });
    })();

    cache.set(resolved.url, promise);
    try {
      return await promise;
    } catch (error) {
      cache.delete(resolved.url);
      throw error;
    }
  }

  function snapshot() {
    const completedLoads = Math.max(0, metrics.cacheMisses - metrics.loadFailures);
    const completedDecodes = decode ? Math.max(0, completedLoads - metrics.decodeFailures) : 0;
    return Object.freeze({
      requests: metrics.requests,
      cacheEntries: cache.size,
      cacheHits: metrics.cacheHits,
      cacheMisses: metrics.cacheMisses,
      loadFailures: metrics.loadFailures,
      decodeFailures: metrics.decodeFailures,
      averageLoadMs: completedLoads ? metrics.totalLoadMs / completedLoads : 0,
      maxLoadMs: metrics.maxLoadMs,
      averageDecodeMs: completedDecodes ? metrics.totalDecodeMs / completedDecodes : 0,
      maxDecodeMs: metrics.maxDecodeMs,
    });
  }

  function clear() {
    cache.clear();
  }

  return Object.freeze({ loadAsset, snapshot, clear });
}
