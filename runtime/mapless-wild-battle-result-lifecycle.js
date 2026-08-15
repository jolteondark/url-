export function resolveWildBattleResult({ speciesName, outcome, runEndPending, event, index, day }) {
  if (typeof speciesName !== "string" || speciesName.length === 0) throw new Error("speciesName is required");
  if (!Number.isInteger(outcome)) throw new Error("outcome must be an integer");
  if (typeof runEndPending !== "boolean") throw new Error("runEndPending must be boolean");
  if (!Number.isInteger(index) || index < 0 || index > 7) throw new Error("board index must be 0..7");
  if (!Number.isInteger(day) || day < 1) throw new Error("day must be a positive integer");
  if (!event || typeof event !== "object" || Array.isArray(event)) throw new Error("event object is required");

  if (runEndPending) {
    return { handled: true, operations: [{ op: "set_notice", text: `${speciesName}との戦闘に敗北しました。` }] };
  }

  const operations = [];
  switch (outcome) {
    case 1:
      operations.push({ op: "display_message", text: "野生ポケモンを退けると、塞がれていた奥への道を進めるようになった。" });
      operations.push({ op: "build_wild_victory_chest", event, index, day, result: "chest_event" });
      operations.push({ op: "show_post_battle_path", chest: "chest_event" });
      break;
    case 4:
      operations.push({ op: "show_post_battle_path", chest: null });
      break;
    case 3:
      operations.push({ op: "set_notice", text: `${speciesName}から逃げました。` });
      break;
    case 2:
    case 5:
      operations.push({ op: "set_notice", text: `${speciesName}との戦闘に敗北しました。` });
      break;
    default:
      operations.push({ op: "set_notice", text: `${speciesName}との戦闘を終えました。` });
      break;
  }
  return { handled: true, operations };
}
