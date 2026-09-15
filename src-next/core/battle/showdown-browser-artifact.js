const REQUIRED_SHOWDOWN_REVISION = 'b1156ff19204e48089e2384eb2c9c1a8004f57ce';

/**
 * Loads the already-built, pinned @pkmn/sim ESM surface for the Battle lane.
 *
 * The artifact descriptor is produced by the build-time contract. New Core
 * owns only this loading boundary: Pokémon battle mechanics remain inside the
 * pinned Showdown-derived artifact. There is deliberately no legacy fallback.
 */
export async function loadShowdownBrowserArtifact(artifact, options = {}) {
  if (!artifact || artifact.showdownRevision !== REQUIRED_SHOWDOWN_REVISION) {
    throw new Error('Showdown browser artifact revision mismatch');
  }
  if (!artifact.esmEntry || typeof artifact.esmEntry !== 'string') {
    throw new Error('Showdown browser artifact ESM entry is missing');
  }

  const importer = options.importer || ((specifier) => import(specifier));
  const module = await importer(artifact.esmEntry);
  const Battle = module?.Battle;

  if (typeof Battle !== 'function') {
    throw new Error('Showdown browser artifact does not export Battle');
  }

  return Object.freeze({
    revision: REQUIRED_SHOWDOWN_REVISION,
    Battle,
  });
}

export { REQUIRED_SHOWDOWN_REVISION };
