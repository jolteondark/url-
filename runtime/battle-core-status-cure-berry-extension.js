const STATUS_CURE_BERRIES = Object.freeze({
  CHERIBERRY: "PARALYSIS",
  CHESTOBERRY: "SLEEP",
  PECHABERRY: "POISON",
  RAWSTBERRY: "BURN",
  ASPEARBERRY: "FROZEN",
});
const LUM_MAJOR_STATUSES = new Set(Object.values(STATUS_CURE_BERRIES));

function canonicalId(value) {
  const raw = typeof value === "string" ? value : value?.id;
  return String(raw ?? "").toUpperCase();
}

function hasOwn(object, key) {
  return Boolean(object) && Object.prototype.hasOwnProperty.call(object, key);
}

function heldItemIdCanonical(pokemon) {
  if (hasOwn(pokemon, "held_item")) return canonicalId(pokemon.held_item);
  return canonicalId(pokemon?.item);
}

function statusIdCanonical(pokemon) {
  return String(pokemon?.status ?? "NONE").toUpperCase();
}

function hpCanonical(pokemon) {
  return Math.max(0, Math.trunc(Number(pokemon?.hp ?? 0)));
}

function consumeRequest(item) {
  return Object.freeze({
    item,
    itemIsBerry: true,
    effectKind: "status_cure",
    permanent: true,
  });
}

export const BATTLE_STATUS_CURE_BERRY_COVERAGE_CANONICAL = Object.freeze({
  itemIds: Object.freeze([...Object.keys(STATUS_CURE_BERRIES), "LUMBERRY"].sort()),
  itemCount: Object.keys(STATUS_CURE_BERRIES).length + 1,
  classificationCounts: Object.freeze({ majorStatusCureBerries: Object.keys(STATUS_CURE_BERRIES).length + 1 }),
  limitation: "Lum Berry projects the canonical major-status cure here; confusion remains owned by the separate confusion state boundary.",
});

export function resolveStatusCureBerryHookCanonical(pokemon = {}) {
  const item = heldItemIdCanonical(pokemon);
  const status = statusIdCanonical(pokemon);
  const alive = hpCanonical(pokemon) > 0;
  const specificStatus = STATUS_CURE_BERRIES[item] ?? null;
  const curesMajorStatus = item === "LUMBERRY"
    ? LUM_MAJOR_STATUSES.has(status)
    : specificStatus === status;
  const triggered = alive && status !== "NONE" && curesMajorStatus;
  return Object.freeze({
    boundary: "action_after",
    item,
    status,
    triggered,
    statusCureRequest: triggered ? Object.freeze({
      kind: "cure",
      source: "held_item",
      expectedStatus: status,
      showMessages: true,
    }) : null,
    consumeRequest: triggered ? consumeRequest(item) : null,
  });
}
