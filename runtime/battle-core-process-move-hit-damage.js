import { reduceHpCanonical } from "./battle-core-hp-faint.js";

function num(v, f = 0) {
  const n = Number(v ?? f);
  return Number.isFinite(n) ? n : f;
}

export function resolveProcessMoveHitDamageApplicationCanonical(input = {}) {
  const state = structuredClone(input ?? {});
  const operations = [];
  const hitNum = num(state.hitNum, 0);
  const targets = Array.isArray(state.targets) ? state.targets.map((raw) => ({
    ...raw,
    index: num(raw.index, -1),
    hpLost: num(raw.hpLost, 0),
    hp: num(raw.hp, 0),
    totalHp: num(raw.totalHp, raw.hp ?? 0),
    substituteHp: num(raw.substituteHp, 0),
    unaffected: Boolean(raw.unaffected),
    missed: Boolean(raw.missed),
    magicCoat: Boolean(raw.magicCoat),
    substitute: Boolean(raw.substitute),
    opposesUser: Boolean(raw.opposesUser),
    effectiveness: num(raw.effectiveness, 0),
  })) : [];

  operations.push({ op: "show_move_animation_request", hitNum, targetIndexes: targets.map((t) => t.index) });
  if (state.gemConsumed != null && hitNum === 0) {
    operations.push({ op: "common_animation_request", name: "UseItem", user: true });
    operations.push({ op: "gem_strengthened_message_request", item: state.gemConsumed });
  }

  if (!Boolean(state.repeatHit)) {
    for (const target of targets) {
      if (!target.missed) continue;
      operations.push({ op: "miss_message_request", targetIndex: target.index });
      if (Boolean(state.userItemActive)) {
        operations.push({ op: "missing_target_item_effect_request", targetIndex: target.index, hitNum });
      }
    }
  }

  if (Boolean(state.damagingMove)) {
    for (const target of targets) {
      if (target.unaffected) continue;
      if (target.substitute) {
        const oldSubstituteHp = target.substituteHp;
        target.substituteHp -= target.hpLost;
        operations.push({ op: "inflict_substitute_damage", targetIndex: target.index, oldHp: oldSubstituteHp, hpAfter: target.substituteHp, amount: target.hpLost });
      } else if (target.hpLost > 0) {
        const reduced = reduceHpCanonical({ hp: target.hp, totalHp: target.totalHp, amount: target.hpLost, anim: false, registerDamage: true, anyAnim: false });
        target.hp = reduced.hpAfter;
        target.hpLost = reduced.amount;
        operations.push({ op: "inflict_hp_damage", targetIndex: target.index, oldHp: reduced.oldHp, hpAfter: reduced.hpAfter, amount: reduced.amount });
      }
    }

    for (const side of [false, true]) {
      const animationTargets = [];
      for (const target of targets) {
        if (target.unaffected || target.hpLost === 0 || target.opposesUser !== side) continue;
        const oldHp = target.substitute ? target.substituteHp + target.hpLost : target.hp + target.hpLost;
        animationTargets.push({ targetIndex: target.index, oldHp, effectiveness: target.effectiveness });
      }
      if (animationTargets.length > 0) operations.push({ op: "hit_hp_loss_animation_request", targets: animationTargets });
    }
  }

  return { reason: "damage_applied", operations, targets };
}
