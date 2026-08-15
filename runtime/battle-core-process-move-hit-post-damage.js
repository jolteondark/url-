import { faintCanonical } from "./battle-core-hp-faint.js";

function num(v, f = 0) {
  const n = Number(v ?? f);
  return Number.isFinite(n) ? n : f;
}

function normalizeBattler(raw = {}) {
  const b = structuredClone(raw ?? {});
  b.index = num(b.index, -1);
  b.hp = num(b.hp, 0);
  b.fainted = b.fainted === undefined ? b.hp <= 0 : Boolean(b.fainted);
  b.unaffected = Boolean(b.unaffected);
  return b;
}

function faintIfNeeded(battler, operations, phase) {
  if (!battler || battler.hp > 0 || battler.faintResolved) return;
  const resolution = faintCanonical({ hp: battler.hp, alreadyFainted: Boolean(battler.alreadyFainted), ...(battler.faintInput ?? {}) });
  battler.faintResolution = resolution;
  battler.faintResolved = resolution.applied || resolution.reason === "already_fainted";
  battler.fainted = battler.hp <= 0;
  operations.push({ op: "faint_resolution", phase, battlerIndex: battler.index, applied: resolution.applied });
  for (const op of resolution.operations ?? []) operations.push({ ...op, phase, battlerIndex: battler.index });
}

export function resolveProcessMoveHitPostDamageCanonical(input = {}) {
  const hitNum = num(input.hitNum, 0);
  const damagingMove = Boolean(input.damagingMove);
  const operations = [];
  const user = normalizeBattler(input.user ?? {});
  const targets = (input.targets ?? []).map(normalizeBattler);
  const byIndex = new Map(targets.map((b) => [b.index, b]));

  // canonical lines 666-668: self-KO helper body remains delegated, faint is Battle Core-owned.
  if (hitNum === 0) operations.push({ op: "self_ko_request", resolved: Boolean(input.selfKoResolved) });
  if (input.selfKoResolved && input.userHpAfterSelfKo !== undefined) {
    user.hp = num(input.userHpAfterSelfKo, user.hp);
    user.fainted = user.hp <= 0;
  }
  faintIfNeeded(user, operations, "after_self_ko");

  if (damagingMove) {
    for (const b of targets) {
      if (b.unaffected) continue;
      operations.push({ op: "hit_effectiveness_message_request", targetIndex: b.index });
      operations.push({ op: "record_damage_lost_request", targetIndex: b.index });
    }
    for (const b of targets) if (!b.unaffected) operations.push({ op: "effect_when_dealing_damage_request", targetIndex: b.index });
    for (const b of targets) if (!b.unaffected) operations.push({ op: "effects_on_making_hit_request", targetIndex: b.index });
    for (const b of targets) if (!b.unaffected) operations.push({ op: "endure_ko_message_request", targetIndex: b.index });

    const priority = Array.isArray(input.priorityBattlers) ? input.priorityBattlers : targets;
    for (const raw of priority) {
      const idx = num(raw?.index, -1);
      if (Boolean(raw?.preventHealingBerry)) continue;
      operations.push({ op: "item_hp_heal_check_request", battlerIndex: idx });
    }
    for (const raw of priority) {
      const idx = num(raw?.index, -1);
      const b = byIndex.get(idx) ?? (idx === user.index ? user : normalizeBattler(raw));
      faintIfNeeded(b, operations, "priority_scan");
    }
  }

  // canonical line 703 is an ordering checkpoint; decision helper body is already separately pinned.
  operations.push({ op: "judge_checkpoint_request", userIndex: user.index });

  for (const b of targets) if (!b.unaffected) operations.push({ op: "effect_against_target_request", targetIndex: b.index });
  operations.push({ op: "effect_general_request" });

  for (const b of targets) faintIfNeeded(b, operations, "after_main_effect");
  faintIfNeeded(user, operations, "after_main_effect");

  return { reason: "post_damage_complete", operations, user, targets };
}
