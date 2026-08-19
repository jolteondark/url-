function sideForBattler(index) {
  return Number(index) === 0 ? "player" : "foe";
}

export function projectSafariStatStagePresentationOperations(resolved, operations = []) {
  const actions = resolved?.battleRuntimeIntegration?.combatTrace?.rounds?.[0]?.actions ?? [];
  const projected = [];
  const emitted = new Set();

  for (const operation of operations ?? []) {
    projected.push(operation);
    if (operation?.op !== "accuracy_check" || operation.hit !== true || !Number.isInteger(operation.action)) continue;
    const actionIndex = Number(operation.action);
    if (emitted.has(actionIndex)) continue;
    const applied = actions[actionIndex]?.statStageResolution?.applied;
    if (!Array.isArray(applied) || applied.length === 0) continue;
    emitted.add(actionIndex);
    for (const change of applied) {
      projected.push({
        op: "stat_stage_change",
        action: actionIndex,
        actor: operation.actor,
        target: sideForBattler(change.battlerIndex),
        battlerIndex: Number(change.battlerIndex),
        stat: change.stat,
        requestedDelta: Number(change.requestedDelta ?? 0),
        appliedDelta: Number(change.appliedDelta ?? 0),
        before: Number(change.before ?? 0),
        after: Number(change.after ?? 0),
        round: operation.round,
        battleTurn: operation.battleTurn,
      });
    }
  }
  return projected;
}
