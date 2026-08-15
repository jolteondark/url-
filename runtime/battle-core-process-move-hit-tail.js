function num(v, f = 0) {
  const n = Number(v ?? f);
  return Number.isFinite(n) ? n : f;
}

function normalizeTarget(raw = {}) {
  return {
    ...raw,
    index: num(raw.index, -1),
    hp: num(raw.hp, 0),
    fainted: Boolean(raw.fainted ?? num(raw.hp, 0) <= 0),
    unaffected: Boolean(raw.unaffected),
    calcDamage: num(raw.calcDamage, 0),
    substitute: Boolean(raw.substitute),
    berryWeakened: Boolean(raw.berryWeakened),
  };
}

export function resolveProcessMoveHitTailCanonical(input = {}) {
  const state = structuredClone(input ?? {});
  const operations = [];
  const hitNum = num(state.hitNum, 0);
  const user = {
    ...(state.user ?? {}),
    index: num(state.user?.index, -1),
    hp: num(state.user?.hp, 0),
    fainted: Boolean(state.user?.fainted ?? num(state.user?.hp, 0) <= 0),
  };
  const targets = (Array.isArray(state.targets) ? state.targets : []).map(normalizeTarget);

  if (!Boolean(state.userSheerForce)) {
    for (const target of targets) {
      if (target.calcDamage === 0) continue;
      const chance = num(target.additionalEffectChance, 0);
      if (chance <= 0) continue;
      const roll = num(target.additionalEffectRoll, 0);
      operations.push({ op: "additional_effect_chance", targetIndex: target.index, chance, roll });
      if (roll < chance) operations.push({ op: "additional_effect_request", targetIndex: target.index });
    }
  }

  for (const target of targets) {
    if (target.fainted || target.calcDamage === 0 || target.substitute) continue;
    const chance = num(target.flinchChance, 0);
    if (chance <= 0) continue;
    const roll = num(target.flinchRoll, 0);
    operations.push({ op: "flinch_chance", targetIndex: target.index, chance, roll });
    if (roll < chance) operations.push({ op: "flinch_request", targetIndex: target.index, userIndex: user.index });
  }

  for (const target of targets) {
    if (target.unaffected || !target.berryWeakened) continue;
    operations.push({ op: "berry_weakened_message_request", targetIndex: target.index, itemName: target.itemName ?? null });
    operations.push({ op: "consume_held_item_request", targetIndex: target.index, reason: "type_weakening_berry" });
  }

  if (["FIRE", "WATER"].includes(state.calcType)) {
    for (const target of targets) {
      if (target.unaffected || target.calcDamage === 0 || target.substitute || !Boolean(target.hasSteamEngine)) continue;
      if (Boolean(target.canRaiseSpeed)) {
        operations.push({ op: "raise_stat_by_ability_request", targetIndex: target.index, ability: "STEAMENGINE", stat: "SPEED", amount: 6 });
      }
    }
  }

  for (const target of targets) {
    if (target.fainted) operations.push({ op: "faint_target_request", targetIndex: target.index });
  }
  if (user.fainted) operations.push({ op: "faint_user_request", userIndex: user.index });

  const repeatHitRequested = Boolean(state.repeatHit) && hitNum === 0 && targets.some((target) => !target.fainted && !target.unaffected);
  if (repeatHitRequested) {
    operations.push({ op: "process_move_hit_repeat_request", hitNum: 1, skipAccuracyCheck: Boolean(state.skipAccuracyCheck) });
  }

  return { reason: "tail_complete", operations, user, targets, repeatHitRequested, returnValue: true };
}
