import { reduceHpCanonical, judgeCanonical, resolveMoveCommandPhaseCanonical, calculatePriorityCanonical } from "./battle-core-turn-vertical-slice.js";
import { resolveEndOfRoundPhaseCanonical } from "./battle-core-end-of-round.js";

export function resolveBattleLoopCanonical(input = {}) {
  const rounds = Array.isArray(input.rounds) ? input.rounds : [];
  let decision = Number(input.initialDecision ?? 0);
  let turnCount = 0;
  const operations = [];
  while (decision <= 0) {
    if (Boolean(input.debug) && turnCount >= 100) {
      decision = Number(input.timeDecision ?? 0);
      operations.push({ op: "decision_on_time", turnCount, decision });
      operations.push({ op: "abort", reason: "undecided_after_100_rounds" });
      return { decision, turnCount, aborted: true, operations };
    }
    const round = rounds[turnCount];
    if (!round) throw new Error(`missing vertical outcomes for round ${turnCount + 1}`);
    const roundNo = turnCount + 1;
    operations.push({ op: "round_header", round: roundNo });
    operations.push({ op: "command_phase", round: roundNo });
    let commandChoices = null;
    if (Array.isArray(round.commandEntries)) {
      const command = resolveMoveCommandPhaseCanonical(round.commandEntries);
      commandChoices = command.choices;
      for (const operation of command.operations) operations.push({ ...operation, round: roundNo });
    } else {
      decision = Number(round.commandDecision ?? decision);
      if (decision > 0) break;
    }
    operations.push({ op: "attack_phase", round: roundNo });
    const actions = Array.isArray(round.actions) ? round.actions : [];
    const selected = commandChoices ? new Map(commandChoices.filter((c) => c.kind === "UseMove").map((c) => [c.battlerIndex, c])) : null;
    const isSelected = (action) => {
      if (!selected || action?.battlerIndex === undefined) return true;
      const choice = selected.get(Number(action.battlerIndex));
      if (!choice) return false;
      if (action.moveIndex !== undefined && Number(action.moveIndex) !== choice.moveIndex) return false;
      if (action.moveId !== undefined && choice.moveId !== null && action.moveId !== choice.moveId) return false;
      return true;
    };
    let order;
    if (Array.isArray(round.priorityEntries)) {
      const entries = round.priorityEntries.filter((entry) => isSelected(actions[Number(entry.actionIndex)]));
      const priority = calculatePriorityCanonical(entries, { trickRoom: Boolean(round.trickRoom), onlySpeedSort: Boolean(round.onlySpeedSort) });
      order = priority.order;
      operations.push({ op: "calculate_priority", round: roundNo, order, entries: priority.entries });
    } else {
      order = Array.isArray(round.priorityOrder) ? round.priorityOrder : actions.map((_, i) => i);
      if (selected) order = order.filter((index) => isSelected(actions[index]));
      operations.push({ op: "calculate_priority", round: roundNo, order, resolvedAdapter: true });
    }
    for (const actionIndex of order) {
      const action = actions[actionIndex];
      if (!action || action.kind !== "move" || !isSelected(action)) continue;
      operations.push({ op: "use_move", round: roundNo, action: actionIndex });
      if (action.moveSkipped) continue;
      const hit = Boolean(action.accuracyHit);
      operations.push({ op: "accuracy_check", round: roundNo, action: actionIndex, hit });
      if (hit) {
        const damage = Number(action.calculatedDamage ?? 0);
        operations.push({ op: "calc_damage", round: roundNo, action: actionIndex, damage });
        if (action.hpBefore !== undefined) operations.push({ op: "reduce_hp", round: roundNo, action: actionIndex, ...reduceHpCanonical({ hp: action.hpBefore, totalHp: action.totalHp, amount: damage, fainted: action.faintedBefore, registerDamage: action.registerDamage !== false }) });
        if (action.fainted) operations.push({ op: "faint", round: roundNo, action: actionIndex });
      }
      const judged = judgeCanonical(action.judgeState ?? {});
      operations.push({ op: "judge", round: roundNo, action: actionIndex, decision: judged });
      if (action.judgeState) decision = judged;
      if (decision > 0) break;
    }
    if (decision > 0) break;
    decision = Number(round.attackDecision ?? decision);
    if (decision > 0) break;
    operations.push({ op: "end_of_round_phase", round: roundNo });
    if (round.endOfRoundInput) {
      const eor = resolveEndOfRoundPhaseCanonical({ initialDecision: decision, ...round.endOfRoundInput });
      for (const operation of eor.operations) operations.push({ ...operation, round: roundNo });
      decision = Number(eor.decision);
      if (decision > 0) break;
    }
    const endDecision = judgeCanonical(round.endJudgeState ?? {});
    operations.push({ op: "judge", round: roundNo, scope: "end_of_round", decision: endDecision });
    if (round.endJudgeState) decision = endDecision;
    if (decision > 0) break;
    turnCount += 1;
  }
  operations.push({ op: "end_of_battle", decision });
  return { decision, turnCount, aborted: false, operations };
}
