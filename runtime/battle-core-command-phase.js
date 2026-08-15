import { resolveMoveCommandPhaseCanonical } from "./battle-core-turn-vertical-slice.js";

function normalizedEntries(entries = []) {
  return entries.map((entry) => entry?.canShowCommands === false ? { ...entry } : {
    ...entry,
    preChoiceKind: "None",
    preChoiceMoveIndex: -1,
    preChoiceMoveId: null,
    preChoiceTargetIndex: -1,
  });
}

function appendLoopOperations(operations, phase, resolved) {
  operations.push({ op: "command_phase_loop", phase });
  for (const operation of resolved.operations) {
    if (operation.op === "clear_choice") continue;
    operations.push({ ...operation, phase });
  }
}

export function resolveCommandPhaseCanonical(input = {}) {
  const entries = Array.isArray(input.commandEntries) ? input.commandEntries : [];
  const battlers = Array.isArray(input.battlers) ? input.battlers : entries.map((entry) => ({
    battlerIndex: Number(entry.battlerIndex ?? -1),
    present: entry.present !== false,
    canShowCommands: entry.canShowCommands !== false,
  }));
  const megaEvolution = Array.isArray(input.megaEvolution) ? structuredClone(input.megaEvolution) : [[], []];
  let decision = Number(input.initialDecision ?? 0);
  const operations = [
    { op: "command_phase_state", active: true },
    { op: "begin_command_phase" },
  ];

  for (const source of battlers) {
    const battler = Number(source?.battlerIndex ?? -1);
    if (source?.present === false || source?.canShowCommands === false) continue;
    operations.push({ op: "clear_choice", battler });
  }

  for (let side = 0; side < 2; side += 1) {
    const sideSlots = Array.isArray(megaEvolution[side]) ? megaEvolution[side] : [];
    for (let owner = 0; owner < sideSlots.length; owner += 1) {
      if (Number(sideSlots[owner]) < 0) continue;
      sideSlots[owner] = -1;
      operations.push({ op: "reset_mega_evolution", side, owner });
    }
  }

  const normalized = normalizedEntries(entries);
  const player = resolveMoveCommandPhaseCanonical(normalized.filter((entry) => Boolean(entry.ownedByPlayer)));
  appendLoopOperations(operations, "player", player);
  decision = Number(input.decisionAfterPlayer ?? decision);
  operations.push({ op: "command_phase_decision_gate", after: "player", decision });
  if (decision > 0) {
    operations.push({ op: "command_phase_state", active: false });
    return { decision, choices: player.choices, megaEvolution, operations };
  }

  const ai = resolveMoveCommandPhaseCanonical(normalized.filter((entry) => !Boolean(entry.ownedByPlayer)));
  appendLoopOperations(operations, "ai", ai);
  decision = Number(input.decisionAfterAi ?? decision);
  operations.push({ op: "command_phase_state", active: false });
  return { decision, choices: [...player.choices, ...ai.choices], megaEvolution, operations };
}
