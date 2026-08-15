export function resolveShowCommands({ message, commands, defaultValue, selectedIndex }) {
  const legal = Array.from(commands).map((label, index) => ({
    kind: "command", index, label: String(label),
  }));
  return {
    result: Number(selectedIndex),
    operations: [{
      op: "decision", kind: "battle_command_list", message, legal,
      context: { default: defaultValue }, selected: { index: Number(selectedIndex) },
    }],
  };
}

export function resolveBattleCommandMenu({ idxBattler, firstAction, battlerExists, canSwitch,
  hasCanRun, canRun, hasCall, selectedCommand }) {
  const legal = [{ kind: "fight", command: 0, label: "たたかう" }];
  if (battlerExists && canSwitch) legal.push({ kind: "party", command: 2, label: "ポケモン" });
  if (hasCanRun && canRun) legal.push({ kind: "run", command: 3, label: "にげる" });
  if (hasCall) legal.push({ kind: "call", command: 4, label: "よびかける" });
  return {
    result: Number(selectedCommand),
    operations: [{
      op: "decision", kind: "battle_main_command", message: "戦闘コマンド", legal,
      context: { battler_index: idxBattler, first_action: firstAction },
      selected: { command: Number(selectedCommand) },
    }],
  };
}

export function resolveBattleFightMenu({ idxBattler, moves, selections, accepted, megaEvoPossible = false }) {
  let remaining = moves.flatMap((move, index) => move == null ? [] : [{
    kind: "move", index, move: move.id, label: move.name, pp: Number(move.pp),
  }]);
  const operations = [];
  let selectionPos = 0;
  while (remaining.length > 0) {
    if (selectionPos >= selections.length) throw new RangeError("selection sequence exhausted");
    const selectedIndex = Number(selections[selectionPos++]);
    operations.push({
      op: "decision", kind: "battle_move", message: "使用する技",
      legal: remaining.map((entry) => ({ ...entry })),
      context: { battler_index: idxBattler, mega_possible: megaEvoPossible },
      selected: { index: selectedIndex },
    });
    const isAccepted = Boolean(accepted[String(selectedIndex)] ?? accepted[selectedIndex] ?? false);
    operations.push({ op: "yield_move", index: selectedIndex, accepted: isAccepted });
    if (isAccepted) return { result: null, operations };
    remaining = remaining.filter((entry) => entry.index !== selectedIndex);
  }
  return { result: null, operations };
}

export function resolveBattleChooseTarget({ idxBattler, targetData, targets, selectedTarget = null }) {
  const legal = targets.map((target) => ({
    kind: "target", index: Number(target.index), label: target.name,
  }));
  if (legal.length === 0) return { result: -1, operations: [] };
  if (selectedTarget == null) throw new TypeError("selectedTarget is required when targets exist");
  return {
    result: Number(selectedTarget),
    operations: [{
      op: "decision", kind: "battle_target", message: "攻撃対象", legal,
      context: { battler_index: idxBattler, target_data: String(targetData) },
      selected: { index: Number(selectedTarget) },
    }],
  };
}
