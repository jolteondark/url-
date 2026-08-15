function n(value, fallback = 0) {
  const x = Number(value ?? fallback);
  return Number.isFinite(x) ? x : fallback;
}

export function resolveEndOfRoundPhaseCanonical(input = {}) {
  const priority = Array.isArray(input.priority) ? input.priority.map((v) => Number(v)) : [];
  const positions = Array.isArray(input.positions) ? input.positions.map((v, index) => Number(v ?? index)) : [];
  const operations = [];
  let decision = n(input.initialDecision, 0);
  let completed = false;

  operations.push({ op: "begin_end_of_round" });
  operations.push({ op: "recalculate_priority" });
  operations.push({ op: "speed_priority", priority });
  operations.push({ op: "end_weather_request", priority });
  for (const position of positions) operations.push({ op: "future_sight_request", position });
  operations.push({ op: "wish_healing_request" });
  operations.push({ op: "sea_of_fire_damage_request", priority });

  for (const battler of priority) {
    operations.push({ op: "terrain_healing_request", battler });
    operations.push({ op: "ability_end_of_round_healing_request", battler });
    operations.push({ op: "item_end_of_round_healing_request", battler });
  }
  if (Boolean(input.affectionEffects) && Boolean(input.internalBattle)) {
    for (const battler of priority) operations.push({ op: "affection_status_cure_check_request", battler });
  }
  operations.push({ op: "healing_effects_request", priority });
  for (const battler of priority) operations.push({ op: "hyper_mode_damage_check_request", battler });
  operations.push({ op: "status_problem_damage_request", priority });
  operations.push({ op: "effect_damage_request", priority });
  for (const battler of priority) operations.push({ op: "trapping_damage_request", battler });
  for (const battler of priority) operations.push({ op: "octolock_request", battler });
  operations.push({ op: "end_battler_effects_request", priority });

  decision = n(input.decisionAfterBattlerEffects, decision);
  operations.push({ op: "decision_checkpoint", stage: "after_battler_effects", decision });
  if (decision > 0) {
    operations.push({ op: "gain_exp_request", reason: "end_of_round_decision" });
    return { decision, completed, reason: "decision_after_battler_effects", operations };
  }

  operations.push({ op: "end_side_effects_request", side: 0, priority });
  operations.push({ op: "end_side_effects_request", side: 1, priority });
  operations.push({ op: "end_field_effects_request", priority });
  operations.push({ op: "end_terrain_request" });
  for (const battler of priority) {
    operations.push({ op: "end_battler_self_effects_request", battler });
    operations.push({ op: "ability_end_of_round_effect_request", battler });
    operations.push({ op: "item_end_of_round_effect_request", battler });
    operations.push({ op: "ability_end_of_round_gain_item_request", battler });
  }
  operations.push({ op: "gain_exp_request", reason: "normal_end_of_round" });

  decision = n(input.decisionAfterGainExp, decision);
  operations.push({ op: "decision_checkpoint", stage: "after_gain_exp", decision });
  if (decision > 0) return { decision, completed, reason: "decision_after_gain_exp", operations };

  for (const battler of priority) operations.push({ op: "check_form_request", battler, endOfRound: true });
  operations.push({ op: "eor_switch_request" });
  decision = n(input.decisionAfterSwitch, decision);
  operations.push({ op: "decision_checkpoint", stage: "after_switch", decision });
  if (decision > 0) return { decision, completed, reason: "decision_after_switch", operations };

  operations.push({ op: "shift_distant_battlers_request" });
  for (const battler of priority) operations.push({ op: "continual_ability_checks_request", battler });
  for (const battler of priority) operations.push({ op: "reset_battler_round_effects_request", battler });
  operations.push({ op: "reset_side_round_effects_request", side: 0 });
  operations.push({ op: "reset_side_round_effects_request", side: 1 });
  operations.push({ op: "reset_field_round_effects_request" });
  operations.push({ op: "end_of_round_complete" });
  completed = true;
  return { decision, completed, reason: "complete", operations };
}
