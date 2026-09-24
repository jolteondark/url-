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

/**
 * Battle-scoped production boundary for the pinned authoritative start. Install
 * both side guards before entering Showdown so neither side can observe a
 * partially guarded battle. Restore both sides even when guard installation or
 * Battle#start throws; if Showdown's pinned initialization contract moved, fail
 * closed after state restoration instead of silently accepting divergence.
 */
export function runAuthoritativeStartWithPersistentLiveCounts(battle, authoritativeStart) {
  if (!battle || !Array.isArray(battle.sides)) throw new Error('Showdown battle sides are unavailable before authoritative start');
  if (typeof authoritativeStart !== 'function') throw new Error('Showdown authoritative start must be callable');

  const restorers = [];
  let installationError;
  for (const side of battle.sides) {
    try {
      restorers.push(preservePersistentLiveCountDuringStart(side));
    } catch (error) {
      installationError = error;
      break;
    }
  }

  let startError;
  if (!installationError) {
    try {
      authoritativeStart.call(battle);
    } catch (error) {
      startError = error;
    }
  }

  const restorationErrors = [];
  for (const restore of restorers.reverse()) {
    try {
      restore();
    } catch (error) {
      restorationErrors.push(error);
    }
  }

  if (installationError) {
    if (restorationErrors.length) {
      throw new AggregateError([installationError, ...restorationErrors], 'Pinned Showdown live-count guard installation failed during authoritative start');
    }
    throw installationError;
  }
  if (startError) throw startError;
  if (restorationErrors.length) {
    throw new AggregateError(restorationErrors, 'Pinned Showdown live-count guard contract failed during authoritative start');
  }
}
