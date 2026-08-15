export function projectSafariBattleSpriteImage(asset, { assetBase = "./" } = {}) {
  if (!asset) return null;
  if (typeof asset.canonical_path !== "string" || !asset.canonical_path.startsWith("Graphics/")) throw new TypeError("canonical Graphics path is required");
  if (typeof asset.side !== "string" || !["player", "foe"].includes(asset.side)) throw new TypeError("battle sprite side must be player or foe");
  if (typeof assetBase !== "string") throw new TypeError("assetBase must be a string");
  const base = assetBase.length === 0 || assetBase.endsWith("/") ? assetBase : assetBase + "/";
  return Object.freeze({ ...asset, src: base + asset.canonical_path });
}
