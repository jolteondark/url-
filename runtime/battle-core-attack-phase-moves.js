import {
  calculatePriorityCanonical,
  resolveGenericTurnVerticalSlice,
  resolveMoveCommandPhaseCanonical,
} from "./battle-core-turn-vertical-slice.js";

function choiceMatchesAction(choice, action) {
  if (!choice || choice.kind !== "UseMove" || !action || action.kind !== "move") return false;
  if (action.battlerIndex !== undefined && Number(action.battlerIndex) !== choice.battlerIndex) return false;
  if (action.moveIndex !== undefined && Number(action.moveIndex) !== choice.moveIndex) return false;
  if (action.moveId !== undefined && choice.moveId !== null && action.moveId !== choice.moveId) return false;
  return true;
}

export function resolveAttackPhaseMovesCanonical({
  commandEntries = [],
  actions = [],
  priorityEntries = [],
  priorityEntriesByLoop = null,
  trickRoom = false,
  mechanicsGeneration = 9,
} = {}) {
  actions = structuredClone(actions);
  const command = resolveMoveCommandPhaseCanonical(commandEntries);
  const choiceByBattler = new Map(command.choices.map((choice) => [choice.battlerIndex, choice]));
  const eligibleAction = (action) => choiceMatchesAction(choiceByBattler.get(Number(action?.battlerIndex)), action);
  const snapshots = Array.isArray(priorityEntriesByLoop) && priorityEntriesByLoop.length > 0 ? priorityEntriesByLoop : [priorityEntries];
  const pending = new Set(priorityEntries.map((entry) => Number(entry.actionIndex)));
  const processOrder = [];
  const operations = [...command.operations];
  let latestPriority = { order: [], entries: [] };

  const canProcess = (action) => {
    const index = actions.indexOf(action);
    return pending.has(index) && eligibleAction(action) && !action.fainted && !action.movedThisRound;
  };
  const process = (action, phase) => {
    const index = actions.indexOf(action);
    processOrder.push(index);
    pending.delete(index);
    action.movedThisRound = true;
    operations.push({ op: "process_turn", phase, action: index });
    return action.advanceAfterProcess === undefined ? true : Boolean(action.advanceAfterProcess);
  };

  let guard = 0;
  while (pending.size > 0) {
    if (++guard > actions.length * 8 + 8) throw new Error("attack phase move loop did not converge");
    const snapshot = snapshots[Math.min(guard - 1, snapshots.length - 1)] ?? [];
    const filteredPriority = snapshot.filter((entry) => pending.has(Number(entry.actionIndex)) && eligibleAction(actions[Number(entry.actionIndex)]));
    latestPriority = calculatePriorityCanonical(filteredPriority, { trickRoom });
    const priorityActions = latestPriority.order.map((index) => actions[index]).filter(Boolean);
    operations.push({ op: "calculate_priority", loop: guard, order: latestPriority.order });
    let advance = false;

    for (const action of priorityActions) {
      if (!canProcess(action) || !action.moveNext) continue;
      advance = process(action, "move_next");
      if (advance) break;
    }
    if (advance) continue;

    for (const action of priorityActions) {
      if (!canProcess(action) || Number(action.quash ?? 0) > 0) continue;
      advance = process(action, "regular");
      if (advance) break;
    }
    if (advance) continue;

    if (Number(mechanicsGeneration) >= 8) {
      for (const action of priorityActions) {
        if (!canProcess(action) || Number(action.quash ?? 0) <= 0) continue;
        advance = process(action, "quashed");
        if (advance) break;
      }
    } else {
      let quashLevel = 0;
      while (!advance) {
        quashLevel += 1;
        let moreQuash = false;
        for (const action of priorityActions) {
          if (!canProcess(action)) continue;
          const level = Number(action.quash ?? 0);
          if (level > quashLevel) moreQuash = true;
          if (level !== quashLevel) continue;
          advance = process(action, "quashed");
          break;
        }
        if (advance || !moreQuash) break;
      }
    }
    if (advance) continue;

    const unfinished = priorityActions.some((action) => canProcess(action));
    if (!unfinished) break;
  }

  return { processOrder, priority: latestPriority, command, operations };
}

export function resolvePlayableMoveRoundCanonical(input = {}) {
  const round = structuredClone(input.round ?? input);
  const scheduling = resolveAttackPhaseMovesCanonical({
    commandEntries: round.commandEntries ?? [],
    actions: round.actions ?? [],
    priorityEntries: round.priorityEntries ?? [],
    priorityEntriesByLoop: round.priorityEntriesByLoop ?? null,
    trickRoom: Boolean(round.trickRoom),
    mechanicsGeneration: Number(round.mechanicsGeneration ?? 9),
  });
  delete round.priorityEntries;
  round.priorityOrder = scheduling.processOrder;
  const vertical = resolveGenericTurnVerticalSlice({ initialDecision: Number(input.initialDecision ?? 0), rounds: [round] });
  return { scheduling, vertical };
}
