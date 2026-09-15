const REQUIRED_SHOWDOWN_REVISION = 'b1156ff19204e48089e2384eb2c9c1a8004f57ce';

function requireExport(module, name, predicate) {
  const value = module?.[name];
  if (!predicate(value)) {
    throw new Error(`Showdown browser artifact does not export ${name}`);
  }
  return value;
}

/**
 * Loads the already-built, pinned @pkmn/sim ESM surface for the Battle lane.
 *
 * The artifact descriptor is produced by the build-time contract. New Core
 * owns only this loading boundary: Pokémon battle mechanics remain inside the
 * pinned Showdown-derived artifact. There is deliberately no legacy fallback.
 *
 * BattleStreams + Teams are exposed alongside Battle because the first real
 * browser vertical must execute Showdown's own simulator protocol rather than
 * reconstructing battle setup/choice semantics in Mapless code. Dex is exposed
 * for the same reason: team packing and format data stay owned by Showdown.
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
  const Battle = requireExport(module, 'Battle', (value) => typeof value === 'function');
  const BattleStreams = requireExport(module, 'BattleStreams', (value) => value && typeof value === 'object');
  const Teams = requireExport(module, 'Teams', (value) => value && typeof value === 'object');
  const Dex = requireExport(module, 'Dex', (value) => value && (typeof value === 'object' || typeof value === 'function'));

  if (typeof BattleStreams.BattleStream !== 'function' || typeof BattleStreams.getPlayerStreams !== 'function') {
    throw new Error('Showdown browser artifact BattleStreams surface is incomplete');
  }
  if (typeof Teams.pack !== 'function') {
    throw new Error('Showdown browser artifact Teams surface is incomplete');
  }

  return Object.freeze({
    revision: REQUIRED_SHOWDOWN_REVISION,
    Battle,
    BattleStreams,
    Teams,
    Dex,
  });
}

export { REQUIRED_SHOWDOWN_REVISION };
