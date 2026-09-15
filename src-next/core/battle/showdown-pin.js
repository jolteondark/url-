// Reconstruction Core Battle integration pin.
// General Pokémon battle semantics are owned by Pokémon Showdown at this exact revision.
// Mapless-specific overrides must be explicit v0.9.108 rules applied by the adapter, not edits here.
export const SHOWDOWN_REPOSITORY = "smogon/pokemon-showdown";
export const SHOWDOWN_REVISION = "b1156ff19204e48089e2384eb2c9c1a8004f57ce";
export const SHOWDOWN_LICENSE = "MIT";

export function getShowdownBattleEnginePin() {
  return Object.freeze({
    repository: SHOWDOWN_REPOSITORY,
    revision: SHOWDOWN_REVISION,
    license: SHOWDOWN_LICENSE,
  });
}
