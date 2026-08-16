import { buildCanonicalPriorityRandomOrder, calculatePriorityCanonical } from "./battle-core-priority.js";
import { resolveAttackPhaseMovesCanonical } from "./battle-core-attack-phase-moves.js";

const COMMAND_OPS = new Set(["clear_choice", "retain_forced_choice", "auto_choose_move", "register_move"]);

function resolveRoundRandomOrder(priorityEntries, input) {
  if (Array.isArray(input.priorityRandomOrder)) return [...input.priorityRandomOrder];
  if (input.priorityRandomSeed === undefined || input.priorityRandomSeed === null) return null;
  const maxBattlerIndex = (priorityEntries ?? []).reduce((maximum, entry, index) => {
    const battlerIndex = Number(entry?.battlerIndex ?? entry?.index ?? index);
    return Number.isInteger(battlerIndex) ? Math.max(maximum, battlerIndex) : maximum;
  }, -1);
  return buildCanonicalPriorityRandomOrder(maxBattlerIndex, input.priorityRandomSeed);
}

export function resolveAttackPhaseCanonical(input = {}) {
  let decision = Number(input.initialDecision ?? 0);
  const operations = [{ op: "begin_attack_phase" }];
  const battlers = Array.isArray(input.battlers) ? input.battlers : [];
  const priorityEntries = input.priorityEntries ?? [];
  const roundRandomOrder = resolveRoundRandomOrder(priorityEntries, input);

  for (const source of battlers) {
    if (!source || source.present === false) continue;
    const battler = Number(source.battlerIndex ?? source.index ?? -1);
    if (!source.fainted) operations.push({ op: "turn_count_increment_request", battler });
    operations.push({ op: "success_state_clear_request", battler });
    const choiceKind = source.choiceKind ?? "None";
    if (!["UseMove", "Shift", "SwitchOut"].includes(choiceKind)) {
      operations.push({ op: "effect_reset_request", battler, effect: "DestinyBond" });
      operations.push({ op: "effect_reset_request", battler, effect: "Grudge" });
    }
    if (!source.choseRageFunction) operations.push({ op: "effect_reset_request", battler, effect: "Rage" });
  }

  const initialPriority = calculatePriorityCanonical(priorityEntries, {
    trickRoom: Boolean(input.trickRoom),
    randomOrder: roundRandomOrder,
  });
  operations.push({
    op: "calculate_priority",
    scope: "attack_phase_start",
    order: initialPriority.order,
    entries: initialPriority.entries,
    ...(roundRandomOrder ? { randomOrder: [...roundRandomOrder] } : {}),
  });
  operations.push({ op: "priority_change_messages_request" });
  operations.push({ op: "attack_phase_call_request" });
  operations.push({ op: "attack_phase_switch_request" });

  decision = Number(input.decisionAfterSwitch ?? decision);
  operations.push({ op: "decision_gate", after: "switch", decision });
  if (decision > 0) return { decision, processOrder: [], initialPriority, operations, stoppedAfter: "switch" };

  operations.push({ op: "attack_phase_items_request" });
  decision = Number(input.decisionAfterItems ?? decision);
  operations.push({ op: "decision_gate", after: "items", decision });
  if (decision > 0) return { decision, processOrder: [], initialPriority, operations, stoppedAfter: "items" };

  operations.push({ op: "mega_evolution_request" });
  const moves = resolveAttackPhaseMovesCanonical({
    commandEntries: input.commandEntries ?? [],
    actions: input.actions ?? [],
    priorityEntries,
    priorityEntriesByLoop: input.priorityEntriesByLoop ?? null,
    trickRoom: Boolean(input.trickRoom),
    mechanicsGeneration: Number(input.mechanicsGeneration ?? 9),
    randomOrder: roundRandomOrder,
  });
  for (const operation of moves.operations) {
    if (!COMMAND_OPS.has(operation.op)) operations.push({ ...operation, scope: operation.scope ?? "attack_phase_moves" });
  }
  decision = Number(input.decisionAfterMoves ?? decision);
  return { decision, processOrder: moves.processOrder, initialPriority, moves, operations, stoppedAfter: null };
}
