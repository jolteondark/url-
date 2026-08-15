function num(value, fallback = 0) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

export function resolveUseMoveEffectsGateCanonical(action = {}) {
  const resolved = structuredClone(action ?? {});
  if (resolved.kind !== "move" || !resolved.useMoveEffectsInput) return resolved;
  const input = resolved.useMoveEffectsInput ?? {};
  const operations = [];
  const finish = (reason, skipped = false) => {
    resolved.moveSkipped = skipped;
    resolved.userLastMoveFailed = Boolean(resolved.userLastMoveFailed || skipped);
    resolved.moveUseEffectsResolution = { reason, operations };
    return resolved;
  };

  if (Boolean(input.userFrozen) && Boolean(input.thawsUser)) {
    operations.push({ op: "cure_status_request", status: "FROZEN", showMessage: false });
    operations.push({ op: "display_melted_ice" });
  }

  if (Boolean(input.powdered) && input.calculatedType === "FIRE") {
    operations.push({ op: "common_animation", name: "Powder" });
    operations.push({ op: "display_powder_explosion" });
    if (!Boolean(input.rainOrHeavyRain) && input.takesIndirectDamage !== false) {
      const totalHp = Math.max(1, num(input.totalHp, 1));
      const damage = Math.round(totalHp / 4);
      operations.push({ op: "effect_damage_request", damage, reason: "powder" });
      operations.push({ op: "gain_exp_request", reason: "powder_effect_damage" });
    }
    operations.push({ op: "cancel_moves" });
    operations.push({ op: "end_turn" });
    return finish("powder_explosion", true);
  }

  if (Boolean(input.damagingMove)) {
    if (input.weather === "HeavyRain" && input.calculatedType === "FIRE") {
      operations.push({ op: "display_heavy_rain_fizzle" });
      operations.push({ op: "cancel_moves" });
      operations.push({ op: "end_turn" });
      return finish("heavy_rain_fizzle", true);
    }
    if (input.weather === "HarshSun" && input.calculatedType === "WATER") {
      operations.push({ op: "display_harsh_sun_evaporation" });
      operations.push({ op: "cancel_moves" });
      operations.push({ op: "end_turn" });
      return finish("harsh_sun_evaporation", true);
    }
  }

  const protean = Boolean(input.proteanOrLiberoActive) && !Boolean(input.callsAnotherMove) &&
    !Boolean(input.snatched) && Boolean(input.hasOtherType) && !Boolean(input.pseudoType);
  if (protean) {
    operations.push({ op: "show_ability_splash" });
    operations.push({ op: "change_types_request", type: input.calculatedType ?? null });
    operations.push({ op: "display_type_changed", type: input.calculatedType ?? null });
    operations.push({ op: "hide_ability_splash" });
    if (input.functionCode === "CurseTargetOrLowerUserSpd1RaiseUserAtkDef1" &&
        (Array.isArray(resolved.resolvedTargetIndexes) ? resolved.resolvedTargetIndexes.length : 0) === 0) {
      resolved.targetIndex = -1;
      const retargets = Array.isArray(input.retargetIndexes) ? input.retargetIndexes.map((x) => num(x, -1)) : [];
      resolved.resolvedTargetIndexes = retargets;
      operations.push({ op: "retarget_request", targetIndex: -1, targetIndexes: retargets });
    }
  }

  operations.push({ op: "quick_charging_move_request" });
  return finish("ready_for_hit_processing", false);
}
