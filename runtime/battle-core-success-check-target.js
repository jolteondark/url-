function b(v) { return Boolean(v); }
function n(v, f = 0) { const x = Number(v ?? f); return Number.isFinite(x) ? x : f; }

function fail(reason, state, operations) {
  operations.push({ op: "target_success_failed", reason });
  return { success: false, reason, protected: b(state.protected), magicCoat: b(state.magicCoat), magicBounce: b(state.magicBounce), typeMod: state.typeMod, operations };
}

export function successCheckAgainstTargetCanonical(input = {}) {
  const state = { protected: b(input.protected), magicCoat: b(input.magicCoat), magicBounce: b(input.magicBounce), typeMod: input.typeMod ?? null };
  const operations = [{ op: "set_type_mod", typeMod: state.typeMod }];
  if (b(input.userTwoTurnAttack)) return { success: true, reason: "charging_turn", ...state, operations };
  if (b(input.moveFailsAgainstTarget)) return fail("move_specific_failure", state, operations);
  if (input.terrain === "PSYCHIC" && b(input.targetAffectedByTerrain) && b(input.targetOpposesUser) && n(input.userMovePriority, 0) > 0) return fail("psychic_terrain_priority_immunity", state, operations);
  const markProtected = (reason, effect) => { state.protected = true; operations.push({ op: "protection_triggered", effect }); return fail(reason, state, operations); };
  if (b(input.craftyShield) && !b(input.userIsTarget) && b(input.statusMove) && !b(input.targetsAll)) return markProtected("crafty_shield", "CraftyShield");
  const unseenFistBypass = b(input.userUnseenFist) && b(input.contactMove);
  if (!unseenFistBypass) {
    if (b(input.wideGuard) && !b(input.userIsTarget) && n(input.moveTargetCount, 0) > 1 && (n(input.mechanicsGeneration, 9) >= 7 || b(input.damagingMove))) return markProtected("wide_guard", "WideGuard");
    if (b(input.canProtectAgainst)) {
      if (b(input.quickGuard) && n(input.userMovePriority, 0) > 0) return markProtected("quick_guard", "QuickGuard");
      if (b(input.protect)) return markProtected("protect", "Protect");
      if (b(input.kingsShield) && b(input.damagingMove)) {
        state.protected = true; operations.push({ op: "protection_triggered", effect: "KingsShield" });
        if (b(input.contactMove) && b(input.userAffectedByContactEffect) && b(input.userCanLowerAttack)) operations.push({ op: "lower_stat_stage_request", stat: "ATTACK", amount: n(input.mechanicsGeneration, 9) >= 8 ? 1 : 2 });
        return fail("kings_shield", state, operations);
      }
      if (b(input.spikyShield)) {
        state.protected = true; operations.push({ op: "protection_triggered", effect: "SpikyShield" });
        if (b(input.contactMove) && b(input.userAffectedByContactEffect) && b(input.userTakesIndirectDamage)) {
          operations.push({ op: "indirect_damage_request", fraction: "1/8" });
          operations.push({ op: "item_hp_heal_check_request", user: true });
        }
        return fail("spiky_shield", state, operations);
      }
      if (b(input.banefulBunker)) {
        state.protected = true; operations.push({ op: "protection_triggered", effect: "BanefulBunker" });
        if (b(input.contactMove) && b(input.userAffectedByContactEffect) && b(input.userCanBePoisoned)) operations.push({ op: "poison_request" });
        return fail("baneful_bunker", state, operations);
      }
      if (b(input.obstruct) && b(input.damagingMove)) {
        state.protected = true; operations.push({ op: "protection_triggered", effect: "Obstruct" });
        if (b(input.contactMove) && b(input.userAffectedByContactEffect) && b(input.userCanLowerDefense)) operations.push({ op: "lower_stat_stage_request", stat: "DEFENSE", amount: 2 });
        return fail("obstruct", state, operations);
      }
      if (b(input.matBlock) && b(input.damagingMove)) return markProtected("mat_block", "MatBlock");
    }
  }
  if (b(input.statusMove) && b(input.canMagicCoat) && !b(input.targetSemiInvulnerable) && b(input.targetOpposesUser)) {
    if (b(input.magicCoatEffect)) { state.magicCoat = true; operations.push({ op: "clear_magic_coat_request" }); return fail("magic_coat", state, operations); }
    if (b(input.targetMagicBounceAbility) && !b(input.moldBreaker) && !b(input.magicBounceEffect)) { state.magicBounce = true; operations.push({ op: "set_magic_bounce_request" }); return fail("magic_bounce", state, operations); }
  }
  if (b(input.immunityByAbility)) return fail("ability_immunity", state, operations);
  if (b(input.damagingMove) && b(input.typeIneffective)) return fail("type_immunity", state, operations);
  if (n(input.mechanicsGeneration, 9) >= 7 && b(input.userPrankster) && b(input.targetDarkType) && b(input.targetOpposesUser)) return fail("prankster_dark_immunity", state, operations);
  if (b(input.damagingMove) && input.calcType === "GROUND" && b(input.targetAirborne) && !b(input.hitsFlyingTargets)) {
    if (b(input.targetLevitateAbility) && !b(input.moldBreaker)) return fail("ground_levitate_immunity", state, operations);
    if (b(input.targetAirBalloon)) return fail("ground_air_balloon_immunity", state, operations);
    if (n(input.targetMagnetRise, 0) > 0) return fail("ground_magnet_rise_immunity", state, operations);
    if (n(input.targetTelekinesis, 0) > 0) return fail("ground_telekinesis_immunity", state, operations);
  }
  if (b(input.powderMove)) {
    if (b(input.targetGrassType) && b(input.moreTypeEffects)) return fail("powder_grass_immunity", state, operations);
    if (n(input.mechanicsGeneration, 9) >= 6) {
      if (b(input.targetOvercoatAbility) && !b(input.moldBreaker)) return fail("powder_overcoat_immunity", state, operations);
      if (b(input.targetSafetyGoggles)) return fail("powder_safety_goggles_immunity", state, operations);
    }
  }
  if (n(input.targetSubstitute, 0) > 0 && b(input.statusMove) && !b(input.ignoresSubstitute) && !b(input.userIsTarget)) return fail("substitute", state, operations);
  operations.push({ op: "target_success_passed" });
  return { success: true, reason: "success", ...state, operations };
}
