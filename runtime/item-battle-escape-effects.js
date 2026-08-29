export const BATTLE_ESCAPE_ITEM_EFFECT_SOURCE = Object.freeze({
  essentialsVersion: "21.1",
  canonicalVersion: "Mapless v0.9.108",
  sourceHandler: "ItemHandlers::UseInBattle",
});

export const BATTLE_ESCAPE_ITEM_EFFECTS = Object.freeze({
  POKEDOLL: Object.freeze({ kind: "guaranteed_wild_escape", battleUse: "Direct" }),
  FLUFFYTAIL: Object.freeze({ kind: "guaranteed_wild_escape", battleUse: "Direct" }),
  POKETOY: Object.freeze({ kind: "guaranteed_wild_escape", battleUse: "Direct" }),
});

function canonicalId(itemId) {
  return String(itemId ?? "").toUpperCase();
}

export function isBattleEscapeItem(itemId) {
  return Object.prototype.hasOwnProperty.call(BATTLE_ESCAPE_ITEM_EFFECTS, canonicalId(itemId));
}

export function resolveBattleEscapeItemEffect({ itemId, wildBattle, canRun } = {}) {
  const id = canonicalId(itemId);
  const effect = BATTLE_ESCAPE_ITEM_EFFECTS[id];
  if (!effect) {
    return { itemId: id, supported: false, used: false, result: "unsupported_item" };
  }

  if (wildBattle !== true) {
    return {
      itemId: id,
      supported: true,
      used: false,
      result: "trainer_battle",
      kind: effect.kind,
      battleUse: effect.battleUse,
    };
  }

  if (canRun !== true) {
    return {
      itemId: id,
      supported: true,
      used: false,
      result: "escape_blocked",
      kind: effect.kind,
      battleUse: effect.battleUse,
    };
  }

  return {
    itemId: id,
    supported: true,
    used: true,
    result: "escaped",
    kind: effect.kind,
    battleUse: effect.battleUse,
    battleDecision: 3,
  };
}
