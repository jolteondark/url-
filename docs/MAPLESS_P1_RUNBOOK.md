# Mapless Reconstruction P1 runbook

This is the execution path for PR #1653. P1 is not complete until both the pure suite and the exact pinned real-engine/Safari gates pass.

## 1. Pure New Core suite

From the repository root:

```sh
node scripts/run-new-core-p1-pure-suite.mjs
```

This covers Fresh Start parity, canonical Board/RNG, canonical GENERAL wild encounter planning, EXP/reward rules, exactly-once commits, Save/Continue, battle RNG, semantic events, the browser controller, deterministic replay, pixel view projection, event-driven presentation, browser storage, and the browser composition root.

It does not execute Pokémon Showdown itself.

## 2. Exact pinned Pokémon Showdown gate

Use a built pinned `pkmn/ps` checkout with:

- `pkmn/ps@4fec8877c83d102528929100b9c45a3a1cc160d3`
- `smogon/pokemon-showdown@b1156ff19204e48089e2384eb2c9c1a8004f57ce` in `vendor/pokemon-showdown`
- the generated `@pkmn/sim` ESM artifact and provenance stamp

Run:

```sh
node scripts/run-showdown-real-roundtrip-suite.mjs /path/to/pinned-pkmn-ps
```

This verifies the existing P0 differential/round-trip gates plus the P1 real playable controller vertical, canonical individual stats, and Safari16 browser publication.

To prepare the pinned checkout from scratch where network access is available:

```sh
node scripts/run-pinned-showdown-roundtrip-local.mjs /path/to/workdir
```

Offline mode can reuse exact git bundles/npm cache through the environment variables already supported by that script.

## 3. Publish the browser engine

After the pinned real suite is green:

```sh
node scripts/publish-pinned-showdown-browser-artifact.mjs \
  /path/to/pinned-pkmn-ps \
  vendor/showdown/browser
```

Expected outputs:

```text
vendor/showdown/browser/
  battle-engine.js
  battle-engine.meta.json
  manifest.json
```

The publication step fails closed if the extractor or mechanics pin moved. The metafile must contain no Node builtins. The manifest records the SHA-256 of the emitted Safari16 ESM bundle.

## 4. Browser / Safari validation

Serve the repository root over HTTP(S); do not open the HTML as a `file://` URL.

Open:

```text
/reconstruction-p1.html
```

Validate on physical iPad Safari and iPhone Safari:

1. Fresh Start shows Day 1 / ¥1000 and the canonical 8-slot Board.
2. Select the Day 1 WILD slot.
3. Eevee back sprite and the generated foe front sprite render as pixel art.
4. Select a move; double taps do not create duplicate Showdown choices.
5. Semantic messages/animations progress without changing mechanics truth.
6. KO commits Showdown HP/PP exactly once.
7. Reward grants canonical EXP + Potion exactly once and returns to Board.
8. Advance to Day 2; the new Board is generated before the save checkpoint.
9. Reload the browser page and Continue.
10. The restored canonical state is byte-equivalent at the New Core save boundary.

## 5. Performance gate

Use the existing browser performance probe during the same first-playable path. Record at minimum frame/FPS trend, long tasks, DOM node count, active timers/rAF count, rerenders, and asset load/decode spikes.

P1 must remain draft if the exact pinned engine suite, physical Safari validation, or first-playable performance gate has not passed.
