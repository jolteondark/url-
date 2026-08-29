export const BATTLE_BOOST_ITEM_EFFECT_SOURCE = Object.freeze({
  essentialsVersion: "21.1",
  mechanicsGeneration: 9,
  xStatItemsRaiseByTwoStages: true,
});

const xItem = (stat, stages) => Object.freeze({
  kind: "raise_stat_stage",
  battleUse: "OnBattler",
  stat,
  stages,
  happinessMethod: "battleitem",
});

export const BATTLE_BOOST_ITEM_EFFECTS = Object.freeze({
  XATTACK: xItem("ATTACK", 2),
  XATTACK2: xItem("ATTACK", 2),
  XATTACK3: xItem("ATTACK", 3),
  XATTACK6: xItem("ATTACK", 6),
  XDEFENSE: xItem("DEFENSE", 2),
  XDEFENSE2: xItem("DEFENSE", 2),
  XDEFENSE3: xItem("DEFENSE", 3),
  XDEFENSE6: xItem("DEFENSE", 6),
  XSPATK: xItem("SPECIAL_ATTACK", 2),
  XSPATK2: xItem("SPECIAL_ATTACK", 2),
  XSPATK3: xItem("SPECIAL_ATTACK", 3),
  XSPATK6: xItem("SPECIAL_ATTACK", 6),
  XSPDEF: xItem("SPECIAL_DEFENSE", 2),
  XSPDEF2: xItem("SPECIAL_DEFENSE", 2),
  XSPDEF3: xItem("SPECIAL_DEFENSE", 3),
  XSPDEF6: xItem("SPECIAL_DEFENSE", 6),
  XSPEED: xItem("SPEED", 2),
  XSPEED2: xItem("SPEED", 2),
  XSPEED3: xItem("SPEED", 3),
  XSPEED6: xItem("SPEED", 6),
  XACCURACY: xItem("ACCURACY", 2),
  XACCURACY2: xItem("ACCURACY", 2),
  XACCURACY3: xItem("ACCURACY", 3),
  XACCURACY6: xItem("ACCURACY", 6),
  DIREHIT: Object.freeze({
    kind: "focus_energy",
    battleUse: "OnBattler",
    canUseBelow: 1,
    setTo: 2,
    happinessMethod: "battleitem",
  }),
  DIREHIT2: Object.freeze({
    kind: "focus_energy",
    battleUse: "OnBattler",
    canUseBelow: 2,
    setTo: 2,
    happinessMethod: "battleitem",
  }),
  DIREHIT3: Object.freeze({
    kind: "focus_energy",
    battleUse: "OnBattler",
    canUseBelow: 3,
    setTo: 3,
    happinessMethod: "battleitem",
  }),
  GUARDSPEC: Object.freeze({
    kind: "side_mist",
    battleUse: "Direct",
    canUseWhenTurnsEqual: 0,
    setTurnsTo: 5,
    happinessMethod: "battleitem",
  }),
});

function integer(value, field) {
  const number = Number(value);
  if (!Number.isInteger(number)) throw new TypeError(`${field} must be an integer`);
  return number;
}

export function isBattleBoostItem(itemId) {
  const id = String(itemId ?? "").toUpperCase();
  return Object.prototype.hasOwnProperty.call(BATTLE_BOOST_ITEM_EFFECTS, id);
}

export function resolveBattleBoostItemEffect({ itemId, statStage, focusEnergy, sideMistTurns } = {}) {
  const id = String(itemId ?? "").toUpperCase();
  const effect = BATTLE_BOOST_ITEM_EFFECTS[id];
  if (!effect) return { itemId: id, supported: false, used: false, result: "unsupported_item" };

  if (effect.kind === "raise_stat_stage") {
    const before = integer(statStage, "statStage");
    if (before < -6 || before > 6) throw new RangeError("statStage must be in -6..6");
    if (before >= 6) {
      return { itemId: id, supported: true, used: false, result: "no_effect", kind: effect.kind, stat: effect.stat, statStageBefore: before, statStageAfter: before };
    }
    const after = Math.min(6, before + effect.stages);
    return { itemId: id, supported: true, used: true, result: "used", kind: effect.kind, stat: effect.stat, stages: effect.stages, statStageBefore: before, statStageAfter: after, happinessMethod: effect.happinessMethod };
  }

  if (effect.kind === "focus_energy") {
    const before = integer(focusEnergy, "focusEnergy");
    if (before < 0) throw new RangeError("focusEnergy must be non-negative");
    if (before >= effect.canUseBelow) {
      return { itemId: id, supported: true, used: false, result: "no_effect", kind: effect.kind, focusEnergyBefore: before, focusEnergyAfter: before };
    }
    return { itemId: id, supported: true, used: true, result: "used", kind: effect.kind, focusEnergyBefore: before, focusEnergyAfter: effect.setTo, happinessMethod: effect.happinessMethod };
  }

  if (effect.kind === "side_mist") {
    const before = integer(sideMistTurns, "sideMistTurns");
    if (before < 0) throw new RangeError("sideMistTurns must be non-negative");
    if (before !== effect.canUseWhenTurnsEqual) {
      return { itemId: id, supported: true, used: false, result: "no_effect", kind: effect.kind, sideMistTurnsBefore: before, sideMistTurnsAfter: before };
    }
    return { itemId: id, supported: true, used: true, result: "used", kind: effect.kind, sideMistTurnsBefore: before, sideMistTurnsAfter: effect.setTurnsTo, happinessMethod: effect.happinessMethod };
  }

  throw new RangeError(`unknown battle boost effect kind: ${effect.kind}`);
}
