# Pokémon Showdown battle-engine dependency

Mapless Reconstruction Core uses Pokémon Showdown as the semantic owner for general Pokémon battle mechanics.

- Upstream: https://github.com/smogon/pokemon-showdown
- Pinned revision: `b1156ff19204e48089e2384eb2c9c1a8004f57ce`
- License: MIT
- Upstream copyright at the pinned revision: Copyright (c) 2011-2026 Guangcong Luo and contributors

## Vendoring rule

Do not float on upstream `master`. Any vendored or substantially copied Pokémon Showdown source must come from the pinned revision above and must retain the upstream MIT copyright and permission notice required by its LICENSE.

The Mapless adapter owns encounter/progression boundaries and explicit Mapless v0.9.108 overrides. It must not fork general battle semantics into Web-specific move/ability/item handlers.

This metadata file records the dependency pin; it is not a substitute for preserving the complete upstream MIT notice alongside vendored/substantially copied source.
