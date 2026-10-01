import { resolveInlineCanonicalBattleSprite } from '../../../runtime/safari-canonical-battle-sprite-inline.js';
import { resolveSafariCanonicalBugBattleSprite } from '../../../runtime/safari-canonical-battle-sprite-bug.js';
import { resolveSafariCanonicalFileBattleSprite } from '../../../runtime/safari-canonical-battle-sprite-assets.js';

function speciesId(value) {
  const id = String(value ?? '').trim().toUpperCase();
  if (!id) throw new Error('battle sprite projection requires species');
  return id;
}

export function resolveP1CanonicalBattleSprite({ species, form = 0, side } = {}) {
  const id = speciesId(species);
  const normalizedSide = side === 'player' ? 'player' : 'foe';
  const battlerIndex = normalizedSide === 'player' ? 0 : 1;
  const input = { species: id, form: Number(form) || 0, side: normalizedSide };
  const asset = resolveInlineCanonicalBattleSprite({ species: id, form: input.form, battlerIndex })
    ?? resolveSafariCanonicalFileBattleSprite(input)
    ?? resolveSafariCanonicalBugBattleSprite(input)
    ?? null;
  if (!asset) return null;
  return Object.freeze({
    species: id,
    side: normalizedSide,
    form: input.form,
    src: String(asset.src),
    canonicalPath: String(asset.canonical_path ?? ''),
    sha256: String(asset.sha256 ?? ''),
  });
}
