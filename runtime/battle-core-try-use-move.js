import { calcDamageCanonical } from "./battle-core-accuracy-damage.js";
import { reduceHpCanonical, faintCanonical } from "./battle-core-hp-faint.js";

function n(v, f = 0) { const x = Number(v ?? f); return Number.isFinite(x) ? x : f; }
function b(v) { return Boolean(v); }

function confusionDamageCanonical(input = {}) {
  const operations = [{ op: "reset_damage_state" }, { op: "prepare_confusion_move", baseDamage: 40, calcType: null, typeMod: 8 }];
  if (!input.damageInput || input.hpBefore === undefined) {
    operations.push({ op: "confusion_damage_request" });
    return { resolved: false, operations };
  }
  const damage = calcDamageCanonical({ baseDamage: 40, ...(input.damageInput ?? {}) });
  const hp = reduceHpCanonical({ hp: input.hpBefore, totalHp: input.totalHp ?? input.hpBefore, amount: damage.damage, ...(input.hpInput ?? {}) });
  operations.push(...hp.operations, { op: "display_confusion_self_damage" }, { op: "record_confusion_damage", amount: hp.amount });
  let faint = null;
  if (hp.hpAfter <= 0) {
    faint = faintCanonical({ hp: hp.hpAfter, ...(input.faintInput ?? {}) });
    operations.push(...faint.operations);
  }
  operations.push({ op: "item_hp_heal_check_request" });
  return { resolved: true, damageResolution: damage, hpReductionResolution: hp, hpAfter: hp.hpAfter, faintResolution: faint, fainted: Boolean(faint?.applied), operations };
}

export function tryUseMoveCanonical(input = {}) {
  const i = structuredClone(input ?? {});
  const operations = [];
  let lastMoveFailed = false;
  let truantState = b(i.truantState);
  let confusionTurns = Math.max(0, n(i.confusionTurns, 0));
  let statusCount = Math.max(0, n(i.statusCount, 0));
  let confusionDamageResolution = null;

  const finish = (success, reason) => ({ success, reason, lastMoveFailed, truantState, confusionTurns, statusCount, confusionDamageResolution, operations });
  const fail = (reason, markFailed = false) => { if (markFailed) lastMoveFailed = true; operations.push({ op: "try_use_move_failed", reason }); return finish(false, reason); };

  operations.push({ op: "can_choose_move_check", success: i.canChooseMoveSuccess !== false });
  if (i.canChooseMoveSuccess === false) return fail("cannot_choose_move", true);
  if (n(i.skyDropIndex, -1) >= 0) return fail("sky_drop");
  if (n(i.hyperBeamTurns, 0) > 0) {
    operations.push({ op: "display_must_recharge" });
    if (b(i.truantActive)) { truantState = !truantState; operations.push({ op: "set_truant_request", value: truantState, reason: "recharge" }); }
    return fail("recharge");
  }
  if (n(i.choiceMoveIndex, 0) === -2) { operations.push({ op: "display_battle_palace_incapable" }); return fail("battle_palace"); }
  if (b(i.skipAccuracyCheck)) { operations.push({ op: "skip_applied_effect_checks" }); return finish(true, "skip_accuracy_check"); }

  if (i.status === "SLEEP") {
    statusCount = Math.max(0, statusCount - 1);
    operations.push({ op: "status_count_update_request", status: "SLEEP", value: statusCount });
    if (statusCount <= 0) operations.push({ op: "cure_status_request", status: "SLEEP" });
    else {
      operations.push({ op: "continue_status_request", status: "SLEEP" });
      if (!b(i.moveUsableWhenAsleep)) return fail("sleep", true);
    }
  } else if (i.status === "FROZEN" && !b(i.moveThawsUser)) {
    const thawed = n(i.frozenThawRoll, 100) < 20;
    if (thawed) operations.push({ op: "cure_status_request", status: "FROZEN" });
    else { operations.push({ op: "continue_status_request", status: "FROZEN" }); return fail("frozen", true); }
  }

  operations.push({ op: "obedience_check", success: i.obedienceCheckSuccess !== false });
  if (i.obedienceCheckSuccess === false) return fail("disobedience");

  if (b(i.truantActive)) {
    truantState = !truantState;
    operations.push({ op: "set_truant_request", value: truantState, reason: "turn" });
    if (!truantState) {
      operations.push({ op: "show_ability_splash_request", ability: "TRUANT" }, { op: "display_loafing" }, { op: "hide_ability_splash_request", ability: "TRUANT" });
      return fail("truant", true);
    }
  }

  if (b(i.flinch)) {
    operations.push({ op: "display_flinched" });
    if (b(i.abilityActive)) operations.push({ op: "on_flinch_ability_request" });
    return fail("flinch", true);
  }

  if (confusionTurns > 0) {
    confusionTurns -= 1;
    operations.push({ op: "confusion_turns_update_request", value: confusionTurns });
    if (confusionTurns <= 0) operations.push({ op: "cure_confusion_request" }, { op: "display_confusion_cured" });
    else {
      operations.push({ op: "common_animation", name: "Confusion" }, { op: "display_confused" });
      const threshold = n(i.mechanicsGeneration, 9) >= 7 ? 33 : 50;
      const roll = n(i.confusionRoll, 100);
      operations.push({ op: "confusion_self_hit_check", threshold, roll });
      if (roll < threshold) {
        confusionDamageResolution = confusionDamageCanonical(i.confusionDamageInput ?? {});
        operations.push(...confusionDamageResolution.operations);
        return fail("confusion_self_hit", true);
      }
    }
  }

  if (i.status === "PARALYSIS") {
    const roll = n(i.paralysisRoll, 100);
    operations.push({ op: "paralysis_check", threshold: 25, roll });
    if (roll < 25) { operations.push({ op: "continue_status_request", status: "PARALYSIS" }); return fail("paralysis", true); }
  }

  if (n(i.attractIndex, -1) >= 0) {
    operations.push({ op: "common_animation", name: "Attract" }, { op: "display_infatuated", attractIndex: n(i.attractIndex, -1) });
    const roll = n(i.attractRoll, 100);
    operations.push({ op: "attract_check", threshold: 50, roll });
    if (roll < 50) { operations.push({ op: "display_immobilized_by_love" }); return fail("attract", true); }
  }
  operations.push({ op: "try_use_move_passed" });
  return finish(true, "success");
}
