# PR #1649: executed P0 validation

Validated on 2026-10-01, starting at PR HEAD
`7dc58e7bc2f8ecd309101c5792285e7e3ff6ce50` (base
`6de3700e1232c235821d61d1fad2aa7cb0aa0474`).

## Executed artifact

| Component | Exact revision |
| --- | --- |
| pkmn/ps extractor | `4fec8877c83d102528929100b9c45a3a1cc160d3` |
| smogon/pokemon-showdown | `b1156ff19204e48089e2384eb2c9c1a8004f57ce` |

Executed checkout: `/workspace/scratch/3911ee255460/pkmn-ps`.
ESM entry: `sim/build/esm/sim/index.mjs`.
Node `v24.19.0`, npm `11.9.0`, TypeScript `6.0.3`.

The build records both checkout revisions and the following SHA-256 provenance:

| File | SHA-256 |
| --- | --- |
| Built ESM entry | `e496c4c5ec20bc1d8860178ec50086df5c521e237b3860b4392c0c6e78e77458` |
| Pinned extractor `import` | `a9ffb5b7aec03d0db988cedf88d4aab1c0a2687e2cf7a14ef7ed91edcc1a083b` |
| Pinned Showdown `sim/battle.ts` | `852dc6eed2876100787090cf049e27d2b061fdb6e808a1edd261468390afaa1f` |
| Pinned Showdown `sim/pokemon.ts` | `df6c9adc9a881b44d0c1468c3408acca0954192ea54ba90df8a710c7183622fd` |

The extractor's `import`/`build` scripts and Showdown's tracked source were
verified unchanged. npm's generated Node-engine metadata in `package-lock.json`
is excluded from the source comparison.

## Commands and results

From the Mapless repository:

```sh
node scripts/run-pinned-showdown-roundtrip-local.mjs /workspace/scratch/3911ee255460/pkmn-ps
node scripts/run-showdown-real-roundtrip-suite.mjs /workspace/scratch/3911ee255460/pkmn-ps
```

Both paths were actually executed. The final local-runner execution re-extracted,
rebuilt, stamped, and ran all five harnesses. Its build commands are:

```sh
git checkout --detach 4fec8877c83d102528929100b9c45a3a1cc160d3
git -C vendor/pokemon-showdown checkout --detach b1156ff19204e48089e2384eb2c9c1a8004f57ce
npm install --ignore-scripts
npm --prefix sim install --ignore-scripts
npm --prefix vendor/pokemon-showdown install --ignore-scripts
node import --debug
npm --prefix sim run build
```

The runner supplies the narrowly scoped import compatibility inputs described
below around `node import --debug`; use the runner to reproduce the entire build.

| Real-engine harness | Result | Executed coverage |
| --- | --- | --- |
| `tests/reconstruction-showdown-real-request-differential.mjs` | PASS | Persistent/raw/request exactness; Sleep; real initial Oran consumption |
| `tests/reconstruction-showdown-real-sleep-roundtrip.mjs` | PASS | Real FIGHT decrements Sleep 3→2; terminal commit, reload, replay rejection, reprojection retain 2 |
| `tests/reconstruction-showdown-real-roundtrip.mjs` | PASS | Two real FIGHT turns, burn HP 60→54, Hyper Voice PP 3→1/maxPP 10, consumed Throat Spray, transient SpA boost, Rotom-Wash form/level/ability |
| `tests/reconstruction-showdown-real-base-moves-persistence.mjs` | PASS | Real Imposter/Transform and FIGHT; executable Thunderbolt PP 5→4; persistent Transform PP 7/maxPP 10 through commit/reload/reprojection |
| `tests/reconstruction-showdown-real-fainted-bench-bookkeeping.mjs` | PASS | Healthy-lead/fainted-bench AND fainted-lead/healthy-bench; real FIGHT, canonical-ID commit, reload, replay rejection and fresh battle |

All asserted raw/request differentials are zero. The mutable persistent fields
and stable identity/species/form/level/base ability are checked against actual
pinned Pokemon objects. Immediate duplicate commits and replays after reload
are rejected. Volatiles and stat stages are excluded from persistence.

Supporting validation: all 38 non-real `reconstruction-showdown-*.mjs` tests
passed; `git diff --check` passed. These supporting checks are separate from the
real-engine results above.

## Concrete incompatibilities fixed

1. Pinned Custom Game enables Team Preview. The first real request assertion
   failed with `p1 must have a move request after hydration`; the engine had
   `requestState = teampreview`, no active Pokemon, and a queued start action.
   Mapless now configures Showdown's own `!Team Preview` custom rule for its
   default Custom Game, so initial switch-in executes during the guarded,
   exactly-once authoritative start.
2. Starting Pikachu at HP 17 with Oran Berry produced HP 27 and an empty held
   item. This was correct Showdown initial Update behavior. The unchanged-state
   differential fixture uses an inert-at-start item, and an additional real
   Oran case explicitly proves the engine-owned heal/consumption remains intact.
3. The one-turn final KO suppressed a new Throat Spray boost: raw SpA was 0,
   not the fixture's expected 1. Pinned `Battle#boost` rejects boosts when no
   opponent remains. A two-turn fixture now observes the real +1 boost before
   the last KO and proves it does not survive persistence/reprojection.
4. The Sleep fixture sent `forfeit` as a player choice and observed
   `terminal === false`. It now uses the actual BattleStream `>forcelose p2`
   control command, after a real Sleep turn, to obtain authoritative terminal
   state without inventing battle mechanics.
5. Partial live-count guard installation demanded a reset from an unexecuted
   Battle#start and masked the installation error. Restoration now skips that
   reset check only when installation failed; successful start still requires
   the pinned reset contract. Cardinality is checked before Pokemon-ID lookup.
6. The exact extractor requests supplemental `championsregma` files and unused
   `sets-megainvasion.json`, absent at the Showdown pin. The runner temporarily
   excludes that supplemental mod and supplies empty optional data only after
   proving pinned random-team source does not reference it. Both inputs are
   restored/removed in `finally`. Stale generated TS configs and provenance are
   excluded from source extraction. Engine source and upstream scripts remain
   unchanged.
7. Newer extractor declarations reject pinned descriptions/tags (for example
   TS2353 `desc` in FormatData and TS2322 `True Past` in SpeciesTag). The build
   emits the unchanged TS engine with `noCheck: true`. Upstream type-check PASS
   is **not** claimed; JavaScript build and all real-engine execution above
   passed. The stamp records `typeCheck: false`.

Older supporting fixtures were updated with canonical item IDs, required
PP/maxPP/faint values, baseMoveSlots, writable live counts and the actual
pre-start lifecycle. Production validation and replay rejection were retained.

## Ownership and completion

Showdown still owns start, switch-in, Transform, FIGHT, damage, PP use, status,
items, boosts, fainting and termination. Mapless hydrates after both authoritative
sides exist, calls original Battle#start once, reads baseMoveSlots for persistent
moves, and commits by stable ID once. No mechanics replacement was added.

P0 is complete for the specified pinned artifact and five harnesses. P1 playable
vertical-slice work was not started.
