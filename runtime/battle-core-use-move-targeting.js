function num(v, f = 0) {
  const n = Number(v ?? f);
  return Number.isFinite(n) ? n : f;
}

function normBattler(raw = {}) {
  return {
    ...structuredClone(raw ?? {}),
    index: num(raw.index, -1), side: num(raw.side, 0), fainted: Boolean(raw.fainted),
    skyDrop: num(raw.skyDrop, -1), snatch: num(raw.snatch, 0), spotlight: num(raw.spotlight, 0),
    followMe: num(raw.followMe, 0), ragePowder: Boolean(raw.ragePowder),
    abilities: Array.isArray(raw.abilities) ? [...raw.abilities] : [],
    nearIndexes: Array.isArray(raw.nearIndexes) ? raw.nearIndexes.map((v) => num(v, -1)) : [],
  };
}

function hasAbility(b, id) { return (b?.abilities ?? []).includes(id); }
function opposes(a, b) { return a && b && a.side !== b.side; }
function near(a, b) { return a?.index === b?.index || (a?.nearIndexes ?? []).includes(b?.index); }
function addTarget(targets, user, target, input, nearOnly = true, allowUser = false) {
  if (!target || (target.fainted && !Boolean(input.targetsPosition))) return false;
  if (!allowUser && target.index === user.index) return false;
  if (nearOnly && !near(user, target) && target.index !== user.index) return false;
  if (targets.some((b) => b.index === target.index)) return true;
  targets.push(target); return true;
}
function addResolvedRandom(targets, user, candidates, resolvedIndex, input, nearOnly, operations, kind) {
  const choices = [];
  for (const b of candidates) { if (!nearOnly || near(user, b)) addTarget(choices, user, b, input, nearOnly); }
  operations.push({ op: `random_${kind}_target_request`, choices: choices.map((b) => b.index), resolvedIndex: resolvedIndex == null ? null : num(resolvedIndex, -1) });
  if (choices.length === 0 || resolvedIndex == null) return;
  const selected = choices.find((b) => b.index === num(resolvedIndex, -1));
  if (selected) addTarget(targets, user, selected, input, nearOnly);
}

export function resolveUseMoveTargetingCanonical(action = {}) {
  const resolved = structuredClone(action ?? {});
  const input = resolved.targetingInput;
  if (resolved.kind !== "move" || !input) return resolved;
  const operations = [];
  const battlers = (input.battlers ?? []).map(normBattler);
  const byIndex = new Map(battlers.map((b) => [b.index, b]));
  const originalUser = byIndex.get(num(input.userIndex ?? resolved.userIndex, -1));
  if (!originalUser) {
    resolved.targetingResolution = { reason: "missing_user", operations, userIndex: -1, targetIndexes: [] };
    return resolved;
  }
  let user = originalUser;
  let preTargetIndex = num(input.preTargetIndex ?? resolved.preTargetIndex, -1);
  let snatched = false;
  operations.push({ op: "find_user", userIndex: user.index });
  if (Boolean(input.statusMove) && Boolean(input.canSnatch)) {
    let newUser = null; let strength = 100;
    for (const b of battlers) {
      if (b.snatch === 0 || b.snatch >= strength || b.skyDrop >= 0) continue;
      newUser = b; strength = b.snatch;
    }
    if (newUser) {
      user = newUser; snatched = true; preTargetIndex = -1;
      operations.push({ op: "snatch_user_change", fromIndex: originalUser.index, toIndex: user.index, strength });
      operations.push({ op: "clear_snatch", battlerIndex: user.index });
      operations.push({ op: "clear_prechosen_target" });
    }
  }
  const targetType = String(input.targetType ?? "None");
  let targets = [];
  const targetBattler = preTargetIndex >= 0 ? byIndex.get(preTargetIndex) : null;
  const sameSide = battlers.filter((b) => b.side === user.side && b.index !== user.index);
  const foes = battlers.filter((b) => b.side !== user.side);
  switch (targetType) {
    case "NearAlly":
      if (!addTarget(targets, user, targetBattler, input)) addResolvedRandom(targets, user, sameSide, input.randomAllyIndex, input, true, operations, "ally");
      break;
    case "UserOrNearAlly":
      if (!addTarget(targets, user, targetBattler, input, true, true)) addTarget(targets, user, user, input, true, true);
      break;
    case "AllAllies": for (const b of sameSide) addTarget(targets, user, b, input, false, true); break;
    case "UserAndAllies":
      addTarget(targets, user, user, input, true, true);
      for (const b of sameSide) addTarget(targets, user, b, input, false, true);
      break;
    case "NearFoe": case "NearOther":
      if (!addTarget(targets, user, targetBattler, input)) {
        if (preTargetIndex >= 0 && targetBattler && !opposes(user, targetBattler)) addResolvedRandom(targets, user, sameSide, input.randomAllyIndex, input, true, operations, "ally");
        else addResolvedRandom(targets, user, foes, input.randomFoeIndex, input, true, operations, "foe");
      }
      break;
    case "RandomNearFoe": addResolvedRandom(targets, user, foes, input.randomFoeIndex, input, true, operations, "foe"); break;
    case "AllNearFoes": for (const b of foes) addTarget(targets, user, b, input); break;
    case "Foe": case "Other":
      if (!addTarget(targets, user, targetBattler, input, false)) {
        if (preTargetIndex >= 0 && targetBattler && !opposes(user, targetBattler)) addResolvedRandom(targets, user, sameSide, input.randomAllyIndex, input, false, operations, "ally");
        else addResolvedRandom(targets, user, foes, input.randomFoeIndex, input, false, operations, "foe");
      }
      break;
    case "AllFoes": for (const b of foes) addTarget(targets, user, b, input, false); break;
    case "AllNearOthers": for (const b of battlers) addTarget(targets, user, b, input); break;
    case "AllBattlers": for (const b of battlers) addTarget(targets, user, b, input, false, true); break;
    default:
      for (const idx of (input.moveSpecificTargetIndexes ?? [])) addTarget(targets, user, byIndex.get(num(idx, -1)), input, false, true);
      operations.push({ op: "move_specific_target_request", targetType, resolvedIndexes: targets.map((b) => b.index) });
  }
  operations.push({ op: "default_targets", targetIndexes: targets.map((b) => b.index) });
  if (!Boolean(input.switching) && !Boolean(input.cannotRedirect) && !Boolean(input.targetsPosition) && input.canTargetOneFoe === true && targets.length === 1) {
    if (Array.isArray(input.modifiedTargetIndexes)) {
      const modified = [];
      for (const idx of input.modifiedTargetIndexes) addTarget(modified, user, byIndex.get(num(idx, -1)), input, false, true);
      targets = modified; operations.push({ op: "modify_targets_resolved", targetIndexes: targets.map((b) => b.index) });
    } else operations.push({ op: "modify_targets_request" });
    if (!Boolean(input.userAntiRedirect) && targets.length === 1) {
      const priority = (input.priorityIndexes ?? battlers.map((b) => b.index)).map((idx) => byIndex.get(num(idx, -1))).filter(Boolean);
      const nearOnly = input.canChooseDistantTarget === false;
      let newTarget = null; let strength = 100;
      for (const b of priority) {
        if (b.fainted || b.skyDrop >= 0 || b.spotlight === 0 || b.spotlight >= strength || !opposes(b, user) || (nearOnly && !near(b, user))) continue;
        newTarget = b; strength = b.spotlight;
      }
      if (newTarget) {
        targets = []; addTarget(targets, user, newTarget, input, nearOnly);
        operations.push({ op: "redirect_spotlight", targetIndex: newTarget.index, strength });
      } else {
        strength = 100;
        for (const b of priority) {
          if (b.fainted || b.skyDrop >= 0 || (b.ragePowder && input.userAffectedByPowder === false) || b.followMe === 0 || b.followMe >= strength || !opposes(b, user) || (nearOnly && !near(b, user))) continue;
          newTarget = b; strength = b.followMe;
        }
        if (newTarget) {
          targets = []; addTarget(targets, user, newTarget, input, nearOnly);
          operations.push({ op: "redirect_follow_me", targetIndex: newTarget.index, strength });
        } else {
          for (const [ability, type] of [["LIGHTNINGROD", "ELECTRIC"], ["STORMDRAIN", "WATER"]]) {
            if (String(input.calcType ?? "") !== type || targets.length !== 1 || hasAbility(targets[0], ability)) continue;
            const drawn = priority.find((b) => b.index !== user.index && b.index !== targets[0].index && hasAbility(b, ability) && (!nearOnly || near(b, user)));
            if (drawn) {
              targets = []; addTarget(targets, user, drawn, input, nearOnly);
              operations.push({ op: "redirect_ability", ability, targetIndex: drawn.index });
            }
          }
        }
      }
    }
  }
  const targetIndexes = targets.map((b) => b.index);
  resolved.effectiveUserIndex = user.index; resolved.targetIndexes = targetIndexes;
  resolved.preTargetIndex = preTargetIndex; resolved.moveSnatched = snatched;
  resolved.targetingResolution = { reason: "targeting_complete", operations, originalUserIndex: originalUser.index, userIndex: user.index, targetIndexes, snatched, preTargetIndex };
  resolved.hitLoopInput = { ...(resolved.hitLoopInput ?? {}), targetIndexes };
  return resolved;
}
