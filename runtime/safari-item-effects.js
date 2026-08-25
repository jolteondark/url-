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
  ANTIDOTE: Object.freeze({
    id: "ANTIDOTE",
    nameJa: "どくけし",
    kind: "cure_status",
    statuses: Object.freeze(["POISON"]),
    source: "original_game_fallback",
  }),
  PARALYZEHEAL: Object.freeze({
    id: "PARALYZEHEAL",
    nameJa: "まひなおし",
    kind: "cure_status",
    statuses: Object.freeze(["PARALYSIS"]),
    source: "original_game_fallback",
  }),
  AWAKENING: Object.freeze({
    id: "AWAKENING",
    nameJa: "ねむけざまし",
    kind: "cure_status",
    statuses: Object.freeze(["SLEEP"]),
    source: "original_game_fallback",
  }),
  BURNHEAL: Object.freeze({
    id: "BURNHEAL",
    nameJa: "やけどなおし",
    kind: "cure_status",
    statuses: Object.freeze(["BURN"]),
    source: "original_game_fallback",
  }),
  ICEHEAL: Object.freeze({
    id: "ICEHEAL",
    nameJa: "こおりなおし",
    kind: "cure_status",
    statuses: Object.freeze(["FROZEN"]),
    source: "original_game_fallback",
  }),
  FULLHEAL: Object.freeze({
    id: "FULLHEAL",
    nameJa: "なんでもなおし",
    kind: "cure_all_status",
    cureConfusion: true,
    source: "original_game_fallback",
  }),
  FULLRESTORE: Object.freeze({
    id: "FULLRESTORE",
    nameJa: "かいふくのくすり",
    kind: "full_restore",
    healMode: "full",
    cureConfusion: true,
    source: "original_game_fallback",
  }),
  REVIVE: Object.freeze({
    id: "REVIVE",
    nameJa: "げんきのかけら",
    kind: "revive",
    healMode: "half",
    source: "original_game_fallback",
  }),
  MAXREVIVE: Object.freeze({
    id: "MAXREVIVE",
    nameJa: "げんきのかたまり",
    kind: "revive",
    healMode: "full",
    source: "original_game_fallback",
  }),
});

const STATUS_ALIASES = Object.freeze({
  POISON: "POISON",
  POISONED: "POISON",
  TOXIC: "POISON",
  BURN: "BURN",
  BURNED: "BURN",
  PARALYSIS: "PARALYSIS",
  PARALYZED: "PARALYSIS",
  SLEEP: "SLEEP",
  ASLEEP: "SLEEP",
  FROZEN: "FROZEN",
  FREEZE: "FROZEN",
});

export function normalizeSafariItemId(itemId) {
  return String(itemId ?? "").trim().toUpperCase();
}

export function normalizeSafariPokemonStatus(status) {
  const id = String(status ?? "").trim().toUpperCase();
  if (!id || id === "NONE" || id === "OK") return null;
  return STATUS_ALIASES[id] ?? id;
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

function statusSnapshot(pokemon) {
  return {
    rawStatus: pokemon?.status ?? null,
    status: normalizeSafariPokemonStatus(pokemon?.status),
    confused: pokemon?.mapless_overworld_confusion === true,
  };
}

function baseResult(effect, pokemon) {
  const { hp: hpBefore, maxHp } = hpSnapshot(pokemon);
  const { rawStatus: statusBeforeRaw, status: statusBefore, confused: confusionBefore } = statusSnapshot(pokemon);
  return {
    supported: true,
    effect,
    hpBefore,
    hpAfter: hpBefore,
    maxHp,
    healedAmount: 0,
    statusBefore,
    statusBeforeRaw,
    statusAfter: statusBefore,
    statusCured: false,
    confusionBefore,
    confusionAfter: confusionBefore,
    confusionCured: false,
    pokemonPatch: {},
  };
}

function resolveHealHp(base) {
  if (base.hpBefore <= 0) return { ...base, usable: false, reason: "fainted_target" };
  if (base.hpBefore >= base.maxHp) return { ...base, usable: false, reason: "no_effect" };
  const hpAfter = base.effect.healMode === "full"
    ? base.maxHp
    : Math.min(base.maxHp, base.hpBefore + Math.max(0, Math.trunc(Number(base.effect.amount ?? 0))));
  return {
    ...base,
    usable: hpAfter > base.hpBefore,
    reason: hpAfter > base.hpBefore ? "used" : "no_effect",
    hpAfter,
    healedAmount: hpAfter - base.hpBefore,
    pokemonPatch: hpAfter > base.hpBefore ? { hp: hpAfter } : {},
  };
}

function resolveCureStatus(base) {
  if (base.hpBefore <= 0) return { ...base, usable: false, reason: "fainted_target" };
  if (!base.statusBefore || !base.effect.statuses.includes(base.statusBefore)) {
    return { ...base, usable: false, reason: "no_effect" };
  }
  return {
    ...base,
    usable: true,
    reason: "used",
    statusAfter: null,
    statusCured: true,
    pokemonPatch: { status: null, status_count: 0 },
  };
}

function resolveCureAllStatus(base) {
  if (base.hpBefore <= 0) return { ...base, usable: false, reason: "fainted_target" };
  const cureStatus = Boolean(base.statusBefore);
  const cureConfusion = base.effect.cureConfusion === true && base.confusionBefore;
  if (!cureStatus && !cureConfusion) return { ...base, usable: false, reason: "no_effect" };
  const pokemonPatch = {};
  if (cureStatus) {
    pokemonPatch.status = null;
    pokemonPatch.status_count = 0;
  }
  if (cureConfusion) pokemonPatch.mapless_overworld_confusion = false;
  return {
    ...base,
    usable: true,
    reason: "used",
    statusAfter: cureStatus ? null : base.statusBefore,
    statusCured: cureStatus,
    confusionAfter: cureConfusion ? false : base.confusionBefore,
    confusionCured: cureConfusion,
    pokemonPatch,
  };
}

function resolveFullRestore(base) {
  if (base.hpBefore <= 0) return { ...base, usable: false, reason: "fainted_target" };
  const healHp = base.hpBefore < base.maxHp;
  const cureStatus = Boolean(base.statusBefore);
  const cureConfusion = base.effect.cureConfusion === true && base.confusionBefore;
  if (!healHp && !cureStatus && !cureConfusion) return { ...base, usable: false, reason: "no_effect" };
  const pokemonPatch = {};
  if (healHp) pokemonPatch.hp = base.maxHp;
  if (cureStatus) {
    pokemonPatch.status = null;
    pokemonPatch.status_count = 0;
  }
  if (cureConfusion) pokemonPatch.mapless_overworld_confusion = false;
  return {
    ...base,
    usable: true,
    reason: "used",
    hpAfter: healHp ? base.maxHp : base.hpBefore,
    healedAmount: healHp ? base.maxHp - base.hpBefore : 0,
    statusAfter: cureStatus ? null : base.statusBefore,
    statusCured: cureStatus,
    confusionAfter: cureConfusion ? false : base.confusionBefore,
    confusionCured: cureConfusion,
    pokemonPatch,
  };
}

function resolveRevive(base) {
  if (base.hpBefore > 0) return { ...base, usable: false, reason: "not_fainted" };
  const hpAfter = base.effect.healMode === "full"
    ? base.maxHp
    : Math.max(1, Math.floor(base.maxHp / 2));
  return {
    ...base,
    usable: true,
    reason: "used",
    hpAfter,
    healedAmount: hpAfter,
    pokemonPatch: { hp: hpAfter },
  };
}

export function canSafariItemTargetPokemon(pokemon, itemId) {
  return resolveSafariPartyItemEffect(pokemon, itemId).usable === true;
}

export function resolveSafariPartyItemEffect(pokemon, itemId) {
  const effect = getSafariItemEffect(itemId);
  if (!effect) return { supported: false, usable: false, reason: "unsupported_item" };
  if (!pokemon || Number(pokemon.steps_to_hatch ?? 0) > 0) {
    return { supported: true, usable: false, reason: "invalid_target", effect };
  }

  const base = baseResult(effect, pokemon);
  if (effect.kind === "heal_hp") return resolveHealHp(base);
  if (effect.kind === "cure_status") return resolveCureStatus(base);
  if (effect.kind === "cure_all_status") return resolveCureAllStatus(base);
  if (effect.kind === "full_restore") return resolveFullRestore(base);
  if (effect.kind === "revive") return resolveRevive(base);
  return { ...base, usable: false, reason: "unsupported_effect" };
}
