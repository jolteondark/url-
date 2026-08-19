import { resolveEndOfRoundPhaseCanonical } from "./battle-core-end-of-round.js";
import { resolveJudgeCanonical } from "./battle-core-judge.js";

function rubyRound(value) {
  const n = Number(value ?? 0);
  return n >= 0 ? Math.floor(n + 0.5) : Math.ceil(n - 0.5);
}

export function reduceHpCanonical({ hp, totalHp, amount, fainted = false, registerDamage = true }) {
  let amt = rubyRound(amount);
  const oldHP = Number(hp ?? 0);
  const maxHP = Number(totalHp ?? oldHP);
  if (amt > oldHP) amt = oldHP;
  if (amt < 1 && !fainted) amt = 1;
  const newHP = oldHP - amt;
  if (newHP < 0) throw new Error("HP less than 0");
  if (newHP > maxHP) throw new Error("HP greater than total HP");
  return {
    amount: amt,
    hpBefore: oldHP,
    hpAfter: newHP,
    droppedBelowHalfHP: amt > 0 && registerDamage && newHP < maxHP / 2 && newHP + amt >= maxHP / 2,
    tookDamageThisRound: amt > 0 && registerDamage,
    tookMoveDamageThisRound: amt > 0 && registerDamage,
  };
}

export function judgeCanonical(input = {}) {
  return Number(resolveJudgeCanonical(input).decision);
}

export function chooseMoveCanonical(source = {}) {
  const battlerIndex = Number(source.battlerIndex ?? -1);
  if (source.fainted) return { battlerIndex, kind: "None", forced: true };
  if (source.canShowFightMenu === false) {
    const encoreMoveIndex = Number(source.encoreMoveIndex ?? -1);
    if (encoreMoveIndex >= 0 && source.encoreCanChoose) {
      return {
        battlerIndex, kind: "UseMove", moveIndex: encoreMoveIndex,
        moveId: source.encoreMoveId ?? null, targetIndex: Number(source.targetIndex ?? -1),
        forced: true, autoReason: "encore",
      };
    }
    return {
      battlerIndex, kind: "UseMove", moveIndex: -1,
      moveId: source.struggleMoveId ?? "STRUGGLE", targetIndex: Number(source.targetIndex ?? -1),
      forced: true, autoReason: "struggle",
    };
  }
  const moveIndex = Number(source.selectedMoveIndex ?? -1);
  if (moveIndex < 0 || source.selectedMoveExists === false || source.selectedMoveCanChoose === false) {
    return { battlerIndex, kind: "None", forced: false, rejected: true };
  }
  return {
    battlerIndex, kind: "UseMove", moveIndex,
    moveId: source.selectedMoveId ?? null, targetIndex: Number(source.targetIndex ?? -1),
    forced: false,
  };
}

export function resolveMoveCommandPhaseCanonical(entries = []) {
  const choices = [];
  const operations = [];
  const ordered = [true, false].flatMap((owned) => entries.filter((entry) => Boolean(entry.ownedByPlayer) === owned));
  for (const entry of ordered) {
    const battlerIndex = Number(entry.battlerIndex ?? -1);
    if (entry.present === false) continue;
    const existingKind = entry.preChoiceKind ?? "None";
    if (existingKind !== "None" || entry.canShowCommands === false) {
      const choice = {
        battlerIndex, kind: existingKind,
        moveIndex: Number(entry.preChoiceMoveIndex ?? -1),
        moveId: entry.preChoiceMoveId ?? null,
        targetIndex: Number(entry.preChoiceTargetIndex ?? -1),
        forced: true,
      };
      choices.push(choice);
      operations.push({ op: "retain_forced_choice", battler: battlerIndex, kind: existingKind });
      continue;
    }
    operations.push({ op: "clear_choice", battler: battlerIndex });
    const choice = chooseMoveCanonical(entry);
    if (choice.kind !== "UseMove") throw new Error(`no valid move choice for battler ${battlerIndex}`);
    choices.push(choice);
    operations.push({
      op: choice.forced ? "auto_choose_move" : "register_move",
      battler: battlerIndex, moveIndex: choice.moveIndex, moveId: choice.moveId,
      targetIndex: choice.targetIndex, ...(choice.autoReason ? { reason: choice.autoReason } : {}),
    });
  }
  return { choices, operations };
}

export function calculatePriorityCanonical(entries = [], { trickRoom = false, onlySpeedSort = false } = {}) {
  const normalized = entries.map((source, index) => {
    const abilitySubPriority = Number(source.abilitySubPriority ?? 0);
    const itemSubPriority = Number(source.itemSubPriority ?? 0);
    let finalSubPriority = abilitySubPriority;
    let priorityAbility = false;
    let priorityItem = false;
    if ((finalSubPriority === 0 && itemSubPriority !== 0) ||
        (finalSubPriority < 0 && itemSubPriority >= 1)) {
      finalSubPriority = itemSubPriority;
      priorityItem = true;
    } else if (finalSubPriority !== 0) {
      priorityAbility = true;
    }
    return {
      actionIndex: Number(source.actionIndex ?? index), speed: Number(source.speed ?? 0),
      abilitySubPriority, itemSubPriority, finalSubPriority,
      movePriority: Number(source.movePriority ?? 0), tieBreaker: Number(source.tieBreaker ?? 0),
      fainted: Boolean(source.fainted), priorityAbility, priorityItem,
    };
  });
  const sorted = [...normalized];
  if (onlySpeedSort) sorted.sort((a, b) => b.speed - a.speed || b.tieBreaker - a.tieBreaker);
  else sorted.sort((a, b) => {
    if (a.movePriority !== b.movePriority) return b.movePriority - a.movePriority;
    if (a.finalSubPriority !== b.finalSubPriority) return b.finalSubPriority - a.finalSubPriority;
    if (a.speed !== b.speed) return trickRoom ? a.speed - b.speed : b.speed - a.speed;
    return b.tieBreaker - a.tieBreaker;
  });
  return { order: sorted.filter((entry) => onlySpeedSort || !entry.fainted).map((entry) => entry.actionIndex), entries: normalized };
}

function appendTryUseOperations(operations, action, roundNo, actionIndex) {
  const confusionSelfHit = action?.tryUseMoveResolution?.reason === "confusion_self_hit";
  for (const operation of action?.tryUseMoveResolution?.operations ?? []) {
    const op = confusionSelfHit && operation.op === "reduce_hp"
      ? "reduce_self_hp"
      : (confusionSelfHit && operation.op === "faint" ? "faint_self" : operation.op);
    operations.push({ ...operation, op, sourceOp: operation.op, round: roundNo, action: actionIndex });
  }
}

function appendHpFunctionOperations(operations, action, roundNo, actionIndex) {
  const resolved = action?.hpFunctionResolution;
  if (!resolved) return;
  const battlerIndex = Number(action.battlerIndex);
  if (Number(resolved.heal ?? 0) > 0) {
    operations.push({
      op: "reduce_self_hp", effect: "heal", healing: true,
      round: roundNo, action: actionIndex, battlerIndex,
      amount: -Number(resolved.heal), hpBefore: Number(resolved.hpBefore), hpAfter: Number(resolved.hpBefore) + Number(resolved.heal),
      functionCode: resolved.functionCode,
    });
  }
  if (Number(resolved.selfDamage ?? 0) > 0) {
    const damageHpBefore = Number(resolved.hpBefore) + Number(resolved.heal ?? 0);
    operations.push({
      op: "reduce_self_hp", effect: "self_damage", selfDamage: true,
      round: roundNo, action: actionIndex, battlerIndex,
      amount: Number(resolved.selfDamage), hpBefore: damageHpBefore, hpAfter: Number(resolved.hpAfter),
      functionCode: resolved.functionCode,
    });
  }
  if (Number(resolved.hpAfter) <= 0 && Number(resolved.hpBefore) > 0) {
    operations.push({ op: "faint_self", round: roundNo, action: actionIndex, battlerIndex, functionCode: resolved.functionCode });
  }
}

export function resolveGenericTurnVerticalSlice(input = {}, { allowIncomplete = false } = {}) {
  const rounds = Array.isArray(input.rounds) ? input.rounds : [];
  let decision = Number(input.initialDecision ?? 0);
  let turnCount = 0;
  let awaitingNextRound = false;
  const operations = [];
  while (decision <= 0) {
    const round = rounds[turnCount];
    if (!round) {
      if (allowIncomplete) {
        awaitingNextRound = true;
        break;
      }
      throw new Error(`missing vertical outcomes for round ${turnCount + 1}`);
    }
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
    const selectedByBattler = commandChoices ? new Map(commandChoices.filter((c) => c.kind === "UseMove").map((c) => [c.battlerIndex, c])) : null;
    const isSelectedAction = (action) => {
      if (!selectedByBattler || action?.battlerIndex === undefined) return true;
      const choice = selectedByBattler.get(Number(action.battlerIndex));
      if (!choice) return false;
      if (action.moveIndex !== undefined && Number(action.moveIndex) !== choice.moveIndex) return false;
      if (action.moveId !== undefined && choice.moveId !== null && action.moveId !== choice.moveId) return false;
      return true;
    };
    let order;
    if (Array.isArray(round.priorityEntries)) {
      const filteredPriority = round.priorityEntries.filter((entry) => isSelectedAction(actions[Number(entry.actionIndex)]));
      const priority = calculatePriorityCanonical(filteredPriority, { trickRoom: Boolean(round.trickRoom), onlySpeedSort: Boolean(round.onlySpeedSort) });
      order = priority.order;
      operations.push({ op: "calculate_priority", round: roundNo, order, entries: priority.entries });
    } else {
      order = Array.isArray(round.priorityOrder) ? round.priorityOrder : actions.map((_, i) => i);
      if (selectedByBattler) order = order.filter((index) => isSelectedAction(actions[index]));
      operations.push({ op: "calculate_priority", round: roundNo, order, resolvedAdapter: true });
    }
    let stoppedForReplacement = false;
    for (let orderIndex = 0; orderIndex < order.length; orderIndex += 1) {
      const actionIndex = order[orderIndex];
      const action = actions[actionIndex];
      if (!action || action.kind !== "move" || !isSelectedAction(action)) continue;
      if (action.cancelledBecauseActorFainted) {
        operations.push({ op: "cancel_action", round: roundNo, action: actionIndex, reason: "actor_fainted" });
        continue;
      }
      appendTryUseOperations(operations, action, roundNo, actionIndex);
      if (action.moveSkipped) {
        operations.push({ op: "cancel_action", round: roundNo, action: actionIndex, reason: action.tryUseMoveResolution?.reason ?? "try_use_failed" });
        const judged = judgeCanonical(action.judgeState ?? {});
        operations.push({ op: "judge", round: roundNo, action: actionIndex, decision: judged });
        if (action.judgeState) decision = judged;
        if (decision > 0) break;
        if (action.stopRoundForReplacement) {
          for (let queuedIndex = orderIndex + 1; queuedIndex < order.length; queuedIndex += 1) {
            const queuedActionIndex = order[queuedIndex];
            const queuedAction = actions[queuedActionIndex];
            if (!queuedAction || queuedAction.kind !== "move" || !isSelectedAction(queuedAction)) continue;
            operations.push({ op: "cancel_action", round: roundNo, action: queuedActionIndex, reason: queuedAction.cancelledBecauseActorFainted ? "actor_fainted" : "replacement_checkpoint" });
          }
          stoppedForReplacement = true;
          break;
        }
        continue;
      }
      operations.push({ op: "use_move", round: roundNo, action: actionIndex });
      const hit = Boolean(action.accuracyHit);
      operations.push({ op: "accuracy_check", round: roundNo, action: actionIndex, hit });
      if (hit) {
        const damage = Number(action.calculatedDamage ?? 0);
        operations.push({ op: "calc_damage", round: roundNo, action: actionIndex, damage });
        if (action.hpBefore !== undefined) {
          const reduced = reduceHpCanonical({ hp: action.hpBefore, totalHp: action.totalHp, amount: damage, fainted: action.faintedBefore, registerDamage: action.registerDamage !== false });
          operations.push({ op: "reduce_hp", round: roundNo, action: actionIndex, ...reduced });
        }
        if (action.fainted) operations.push({ op: "faint", round: roundNo, action: actionIndex });
      }
      appendHpFunctionOperations(operations, action, roundNo, actionIndex);
      const judged = judgeCanonical(action.judgeState ?? {});
      operations.push({ op: "judge", round: roundNo, action: actionIndex, decision: judged });
      if (action.judgeState) decision = judged;
      if (decision > 0) break;
      if (action.stopRoundForReplacement) {
        for (let queuedIndex = orderIndex + 1; queuedIndex < order.length; queuedIndex += 1) {
          const queuedActionIndex = order[queuedIndex];
          const queuedAction = actions[queuedActionIndex];
          if (!queuedAction || queuedAction.kind !== "move" || !isSelectedAction(queuedAction)) continue;
          operations.push({
            op: "cancel_action",
            round: roundNo,
            action: queuedActionIndex,
            reason: queuedAction.cancelledBecauseActorFainted ? "actor_fainted" : "replacement_checkpoint",
          });
        }
        stoppedForReplacement = true;
        break;
      }
    }
    if (decision > 0) break;
    if (stoppedForReplacement) {
      turnCount += 1;
      continue;
    }
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
  if (decision > 0) operations.push({ op: "end_of_battle", decision });
  return {
    decision,
    turnCount,
    operations,
    ...(awaitingNextRound ? { awaitingNextRound: true } : {}),
  };
}
