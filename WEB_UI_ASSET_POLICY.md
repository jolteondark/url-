# Mapless Web UI Asset Policy

## Core rule

**Do not recreate an existing canonical Mapless / Pokémon Essentials visual asset with custom HTML/CSS.**

If a usable canonical image, sprite, window skin, icon, menu graphic, battle graphic, or event presentation asset already exists, the Web/Safari implementation should reuse that asset and make it interactive rather than visually rebuilding it from scratch.

## Web layer responsibilities

HTML/CSS/JS should primarily provide:

- layout and responsive placement
- touch / pointer hit targets
- focus and keyboard handling
- safe-area and viewport adaptation
- accessibility metadata
- state synchronization and interaction wiring
- minimal fallback presentation when no canonical visual asset exists

The Web layer is an **interaction and delivery layer**, not a second art/UI implementation.

## Before creating new UI

Before adding a new custom panel, card, menu, icon, window, or battle/event presentation:

1. Search the repository and canonical v0.9.108 source/assets for an existing visual asset.
2. If one exists, reuse it.
3. If the asset exists but cannot yet be rendered on Web, implement the missing rendering/adapter path instead of replacing it with a new visual design.
4. Only create a new Web-specific visual when no canonical asset exists or a browser limitation makes reuse impractical.

Any exception should be explicit in the PR/commit rationale.

## Existing custom UI

Do not block progress on a full rewrite of existing Web-specific UI. Replace it incrementally when the relevant screen/event is touched.

Priority:

1. stop introducing unnecessary new custom UI;
2. reuse canonical assets for new work;
3. migrate existing custom UI toward canonical assets over time.

## Product goal

The target is not to design a browser imitation of Mapless.

**The target is to make the canonical Mapless presentation run and remain playable in the browser.**
