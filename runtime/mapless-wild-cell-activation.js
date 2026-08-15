import { resolveWildBattleResult } from "./mapless-wild-battle-result-lifecycle.js";

export function resolveWildCellActivation(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("input object is required");
  const {
    index, event, day: rawDay, can_battle: canBattle, encounter, species_exists: speciesExists,
    species_name: speciesName, outcome, run_end_pending: runEndPending,
    old_consumed: oldConsumed, game_temp_present: gameTempPresent, battle_error: battleError
  } = input;
  if (!Number.isInteger(index) || index < 0 || index > 7) throw new Error("board index must be 0..7");
  if (!event || typeof event !== "object" || Array.isArray(event)) throw new Error("event object is required");
  if (typeof canBattle !== "boolean") throw new Error("can_battle must be boolean");
  if (!Number.isInteger(rawDay)) throw new Error("day must be an integer");
  const operations = [];
  if (!canBattle) {
    operations.push({ op: "set_notice", text: "戦えるポケモンがいません。" });
    operations.push({ op: "play_buzzer" });
    return { operations, result: false };
  }
  const day = Math.max(rawDay, 1);
  operations.push({ op: "create_general_type_encounter", type: event.type, day, category: "NORMAL", modifier: 0, final_flag: true });
  if (!encounter || !speciesExists) {
    operations.push({ op: "set_notice", text: "野生ポケモンを生成できませんでした。" });
    return { operations, result: false };
  }
  if (typeof speciesName !== "string" || speciesName.length === 0) throw new Error("species_name is required for a valid encounter");
  if (!Number.isInteger(encounter.level)) throw new Error("encounter level must be an integer");
  operations.push({ op: "display_message", text: `暗闇から${speciesName}が飛び出した！` });
  operations.push({ op: "display_message", text: `野生の${speciesName}が暗がりから飛び出し、襲いかかってきた！` });
  operations.push({ op: "set_board_consumed", index, value: true });
  try {
    operations.push({ op: "set_battle_rule", rule: "canLose" });
    if (battleError) {
      const className = String(battleError.class_name ?? "Error");
      const message = String(battleError.message ?? "");
      throw Object.assign(new Error(message), { canonicalClass: className });
    }
    operations.push({ op: "start_wild_battle", species_id: encounter.species_id, level: encounter.level, outcome });
    const post = resolveWildBattleResult({
      speciesName, outcome, runEndPending: Boolean(runEndPending), event, index, day
    });
    operations.push(...post.operations);
    return { operations, result: true };
  } catch (error) {
    operations.push({ op: "set_board_consumed", index, value: oldConsumed });
    operations.push({ op: "log", text: `wild battle failed: ${error.canonicalClass ?? error.name}: ${error.message}` });
    operations.push({ op: "set_notice", text: "野生戦闘を開始できませんでした。" });
    return { operations, result: false };
  } finally {
    if (gameTempPresent) operations.push({ op: "clear_battle_rules" });
  }
}
