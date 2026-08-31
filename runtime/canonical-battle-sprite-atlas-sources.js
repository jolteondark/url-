const PUBLISHED_CANONICAL_BATTLE_SPRITE_ATLASES = Object.freeze({
  "day1-front-96": Object.freeze({
    directory: "day1-front",
    prefix: "front",
    chunks: 6,
  }),
  "day1-back-96": Object.freeze({
    directory: "day1-back",
    prefix: "back",
    chunks: 1,
  }),
});

export function canonicalBattleSpriteAtlasPath(family, chunk = 0) {
  const safeFamily = String(family ?? "").trim();
  const source = PUBLISHED_CANONICAL_BATTLE_SPRITE_ATLASES[safeFamily];
  const safeChunk = Number(chunk);
  if (!source || !Number.isInteger(safeChunk) || safeChunk < 0 || safeChunk >= source.chunks) return null;
  const index = String(safeChunk).padStart(2, "0");
  return `../assets/canonical-battle-sprites/${source.directory}/${source.prefix}-${index}.webp`;
}

export function canonicalBattleSpriteAtlasUrl(family, chunk = 0, baseUrl = import.meta.url) {
  const path = canonicalBattleSpriteAtlasPath(family, chunk);
  return path ? new URL(path, baseUrl).href : null;
}

export function canonicalBattleSpriteAtlasResolutionState(family, chunk = 0) {
  const path = canonicalBattleSpriteAtlasPath(family, chunk);
  return path
    ? Object.freeze({ status: "eligible", family: String(family), chunk: Number(chunk), path })
    : Object.freeze({ status: "blocked", family: String(family ?? ""), chunk: Number(chunk), reason: "unpublished-or-invalid-atlas" });
}

export { PUBLISHED_CANONICAL_BATTLE_SPRITE_ATLASES };
