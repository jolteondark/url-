// Safari/Web party item effects.
// Canonical v0.9.108 is authoritative when it defines mechanics. For canonical
// shop items whose mechanics are not yet extracted into Web data, use the
// unchanged main-series effect rather than inventing a Web-only substitute.
const ITEM_EFFECTS = Object.freeze({
  POTION: Object.freeze({
    id: "POTION",
    nameJa: "キズぐすり",
    kind: "heal_hp",
    healMode: "fixed",
    amount: 20,
    source: "canonical_v0.9.108",
  }),
  SUPERPOTION: Object.freeze({
    id: "SUPERPOTION",
    nameJa: "いいキズぐすり",
    kind: "heal_hp",
    healMode: "fixed",
    amount: 60,
    source: "original_game_fallback",
  }),
  HYPERPOTION: Object.freeze({
    id: "HYPERPOTION",
    nameJa: "すごいキズぐすり",
    kind: "heal_hp",
    healMode: "fixed",
    amount: 120,
    source: "original_game_fallback",
  }),
  MAXPOTION: Object.freeze({
    id: "MAXPOTION",
    nameJa: "まんたんのくすり",
    kind: "heal_hp",
    healMode: "full",
    amount: null,
    source: "original_game_fallback",
  }),
});

export function normalizeSafariItemId(itemId) {
  return String(itemId ?? "").trim().toUpperCase();
}

export function getSafariItemEffect(itemId) {
  return ITEM_EFFECTS[normalizeSafariItemId(itemId)] ?? null;
}

export function getSafariItemDisplayName(itemId) {
  const id = normalizeSafariItemId(itemId);
  return ITEM_EFFECTS[id]?.nameJa ?? id;
}

export function isSafariPartyItemSupported(itemId) {
  return getSafariItemEffect(itemId) !== null;
}

function hpSnapshot(pokemon) {
  const hp = Math.max(0, Math.trunc(Number(pokemon?.hp ?? 0)));
  const maxHp = Math.max(1, Math.trunc(Number(pokemon?.max_hp ?? hp ?? 1)));
  return { hp, maxHp };
}

export function canSafariItemTargetPokemon(pokemon, itemId) {
  const effect = getSafariItemEffect(itemId);
  if (!effect || !pokemon || Number(pokemon.steps_to_hatch ?? 0) > 0) return false;
  if (effect.kind !== "heal_hp") return false;
  const { hp, maxHp } = hpSnapshot(pokemon);
  return hp > 0 && hp < maxHp;
}

export function resolveSafariPartyItemEffect(pokemon, itemId) {
  const effect = getSafariItemEffect(itemId);
  if (!effect) return { supported: false, usable: false, reason: "unsupported_item" };
  if (!pokemon || Number(pokemon.steps_to_hatch ?? 0) > 0) {
    return { supported: true, usable: false, reason: "invalid_target", effect };
  }
  if (effect.kind !== "heal_hp") {
    return { supported: true, usable: false, reason: "unsupported_effect", effect };
  }

  const { hp: hpBefore, maxHp } = hpSnapshot(pokemon);
  if (hpBefore <= 0) {
    return { supported: true, usable: false, reason: "fainted_target", effect, hpBefore, maxHp };
  }
  if (hpBefore >= maxHp) {
    return { supported: true, usable: false, reason: "no_effect", effect, hpBefore, maxHp };
  }

  const hpAfter = effect.healMode === "full"
    ? maxHp
    : Math.min(maxHp, hpBefore + Math.max(0, Math.trunc(Number(effect.amount ?? 0))));
  return {
    supported: true,
    usable: hpAfter > hpBefore,
    reason: hpAfter > hpBefore ? "used" : "no_effect",
    effect,
    hpBefore,
    hpAfter,
    maxHp,
    healedAmount: hpAfter - hpBefore,
  };
}
