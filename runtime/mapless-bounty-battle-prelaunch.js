export function buildBountyBattlePrelaunch(input) {
  const { species_name: speciesName, confirmed, quest, capabilities, battle_outcome: battleOutcome, carryover } = input;
  if (!speciesName || !quest || !capabilities || !carryover) {
    throw new Error("complete bounty prelaunch input is required");
  }
  const operations = [
    { op: "confirm", message: `${speciesName}の討伐へ向かいますか？`, result: Boolean(confirmed) }
  ];
  if (!confirmed) {
    return { operations, result: false };
  }
  if (capabilities.sound_feedback) {
    operations.push({ op: "battle_alert" });
  }
  const target = {
    species: quest.species,
    level: Number.parseInt(quest.level, 10)
  };
  if (capabilities.form_setter) {
    target.form = Number.parseInt(quest.form ?? 0, 10);
  }
  if (quest.personal_id !== undefined && quest.personal_id !== null && capabilities.personal_id_setter) {
    target.personal_id = Number.parseInt(quest.personal_id, 10);
  }
  const gender = Number.parseInt(quest.gender ?? 0, 10);
  if (gender < 2 && capabilities.gender_setter) {
    target.gender = gender;
  }
  operations.push({ op: "construct_target", target });
  operations.push({ op: "set_battle_rule", rule: "canLose" });
  operations.push({ op: "start_wild_battle_core", target, outcome: battleOutcome });
  if (carryover.defined && carryover.run_end_pending) {
    return { operations, result: "run_end" };
  }
  return { operations, result: { continue_to_outcome: battleOutcome } };
}
