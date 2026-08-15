export function resolveTrainerCellActivation(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("input object is required");
  const {
    index, day: rawDay, can_battle: canBattle, dynamic_result: dynamicResult,
    last_error: lastError, start_error: startError
  } = input;
  if (!Number.isInteger(index) || index < 0 || index > 7) throw new Error("board index must be 0..7");
  if (!Number.isInteger(rawDay)) throw new Error("day must be an integer");
  if (typeof canBattle !== "boolean") throw new Error("can_battle must be boolean");
  const operations = [];
  if (!canBattle) {
    operations.push({ op: "set_notice", text: "戦えるポケモンがいません。" });
    operations.push({ op: "play_buzzer" });
    return { operations, result: null };
  }
  const day = Math.max(rawDay, 1);
  try {
    operations.push({ op: "start_dynamic_trainer", day, category: "NORMAL", modifier: 0, fixed_trainer: null });
    if (startError) {
      const className = String(startError.class_name ?? "Error");
      const message = String(startError.message ?? "");
      throw Object.assign(new Error(message), { canonicalClass: className });
    }
    if (!dynamicResult) {
      operations.push({ op: "set_notice", text: lastError || "トレーナーを生成できませんでした。" });
      operations.push({ op: "play_buzzer" });
      return { operations, result: null };
    }
    if (!Number.isInteger(dynamicResult.outcome)) throw new Error("dynamic_result.outcome must be an integer");
    if (typeof dynamicResult.trainer_full_name !== "string" || dynamicResult.trainer_full_name.length === 0) {
      throw new Error("dynamic_result.trainer_full_name is required");
    }
    operations.push({ op: "set_board_consumed", index, value: true });
    let notice;
    if (dynamicResult.outcome === 1) notice = `${dynamicResult.trainer_full_name}に勝利しました。`;
    else if (dynamicResult.outcome === 2 || dynamicResult.outcome === 5) notice = "トレーナー戦に敗北しました。";
    else notice = "トレーナー戦を終了しました。";
    operations.push({ op: "set_notice", text: notice });
    return { operations, result: null };
  } catch (error) {
    operations.push({ op: "set_notice", text: "トレーナー戦でエラーが発生しました。" });
    operations.push({ op: "log", text: `[MaplessDayBoard] Trainer event failed: ${error.canonicalClass ?? error.name}: ${error.message}` });
    return { operations, result: null };
  }
}
