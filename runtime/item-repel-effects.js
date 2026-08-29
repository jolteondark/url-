export const REPEL_ITEM_EFFECT_SOURCE = Object.freeze({
  essentialsVersion: "21.1",
  canonicalVersion: "Mapless v0.9.108",
  sourceHandler: "ItemHandlers::UseInField/pbRepel",
});

export const REPEL_ITEM_EFFECTS = Object.freeze({
  REPEL: Object.freeze({ kind: "repel", fieldUse: "Direct", steps: 100 }),
  SUPERREPEL: Object.freeze({ kind: "repel", fieldUse: "Direct", steps: 200 }),
  MAXREPEL: Object.freeze({ kind: "repel", fieldUse: "Direct", steps: 250 }),
});

function canonicalId(itemId) {
  return String(itemId ?? "").toUpperCase();
}

function normalizedActiveSteps(activeSteps) {
  const steps = Number(activeSteps);
  if (!Number.isFinite(steps)) return 0;
  return Math.max(0, Math.floor(steps));
}

export function isRepelItem(itemId) {
  return Object.prototype.hasOwnProperty.call(REPEL_ITEM_EFFECTS, canonicalId(itemId));
}

export function resolveRepelItemEffect({ itemId, activeSteps = 0 } = {}) {
  const id = canonicalId(itemId);
  const effect = REPEL_ITEM_EFFECTS[id];
  if (!effect) {
    return { itemId: id, supported: false, used: false, result: "unsupported_item" };
  }

  const currentSteps = normalizedActiveSteps(activeSteps);
  if (currentSteps > 0) {
    return {
      itemId: id,
      supported: true,
      used: false,
      result: "repel_already_active",
      kind: effect.kind,
      fieldUse: effect.fieldUse,
      activeSteps: currentSteps,
    };
  }

  return {
    itemId: id,
    supported: true,
    used: true,
    result: "repel_started",
    kind: effect.kind,
    fieldUse: effect.fieldUse,
    activeSteps: effect.steps,
  };
}
