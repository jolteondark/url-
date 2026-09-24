function exactLiveCount(side) {
  return (side?.pokemon ?? []).filter((pokemon) => Number(pokemon?.hp ?? 0) > 0 && !pokemon?.fainted).length;
}

/**
 * Preserve Mapless's hydrated persistent live-party count while pinned Showdown
 * executes Battle#start. The pinned start queue performs one legacy
 * `pokemonLeft = pokemon.length` initialization; that assignment is the only
 * write suppressed here, and only when it would actually resurrect a persisted
 * fainted party member. All reads during start continue to observe the exact
 * hydrated count, and every other write remains Showdown-owned.
 *
 * The returned restore function must be called immediately after the
 * authoritative start call (normally from a finally block).
 */
export function preservePersistentLiveCountDuringStart(side) {
  if (!side || !Array.isArray(side.pokemon)) throw new Error('Showdown side is unavailable before authoritative start');
  const descriptor = Object.getOwnPropertyDescriptor(side, 'pokemonLeft');
  if (!descriptor || descriptor.get || descriptor.set || descriptor.configurable === false) {
    throw new Error('Pinned Showdown pokemonLeft must be a configurable data property');
  }

  const persistentLive = exactLiveCount(side);
  const teamLength = side.pokemon.length;
  const expectsQueuedResetSuppression = persistentLive !== teamLength;
  let visible = persistentLive;
  let suppressedQueuedReset = false;

  Object.defineProperty(side, 'pokemonLeft', {
    configurable: true,
    enumerable: descriptor.enumerable,
    get() {
      return visible;
    },
    set(value) {
      // Pinned Showdown's queued start action initializes pokemonLeft from the
      // generated team size. Suppress that one initialization only when it
      // would resurrect a persisted fainted member; an all-live party needs no
      // adapter interception at all.
      if (!suppressedQueuedReset && expectsQueuedResetSuppression && Number(value) === teamLength) {
        suppressedQueuedReset = true;
        return;
      }
      visible = value;
    },
  });

  return function restorePersistentLiveCountGuard() {
    const finalValue = visible;
    Object.defineProperty(side, 'pokemonLeft', { ...descriptor, value: finalValue });
    if (expectsQueuedResetSuppression && !suppressedQueuedReset) {
      throw new Error('Pinned Showdown start did not perform the expected pokemonLeft team-length initialization');
    }
    return { persistentLive, finalValue, suppressedQueuedReset };
  };
}
