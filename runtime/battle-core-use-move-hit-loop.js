import { resolveProcessMoveHitPreludeCanonical } from "./battle-core-process-move-hit.js";
import { resolveProcessMoveHitDamageApplicationCanonical } from "./battle-core-process-move-hit-damage.js";
import { resolveProcessMoveHitPostDamageCanonical } from "./battle-core-process-move-hit-post-damage.js";
import { resolveProcessMoveHitTailCanonical } from "./battle-core-process-move-hit-tail.js";

function num(v, f = 0) {
  const n = Number(v ?? f);
  return Number.isFinite(n) ? n : f;
}

export function resolveUseMoveHitLoopCanonical(action = {}) {
  const resolved = structuredClone(action ?? {});
  const input = resolved.hitLoopInput;
  if (resolved.kind !== "move" || !input) return resolved;

  const operations = [];
  const targetIndexes = Array.isArray(input.targetIndexes) ? input.targetIndexes.map((v) => num(v, -1)) : [];
  const targetChecks = Array.isArray(input.targetChecks) ? input.targetChecks : [];
  const targetState = new Map(targetChecks.map((t) => [num(t.index, -1), {
    index: num(t.index, -1),
    protected: Boolean(t.protected),
    unaffected: Boolean(t.unaffected),
    fainted: Boolean(t.fainted),
    success: t.success !== false,
  }]));
  const magicCoater = num(input.magicCoaterIndex, -1);
  const magicBouncer = num(input.magicBouncerIndex, -1);

  if (targetIndexes.length === 0 && num(input.moveTargetCount, 0) > 0 && !Boolean(input.worksWithNoTargets)) {
    operations.push({ op: "display_no_target" });
    resolved.userLastMoveFailed = true;
    resolved.hitLoopResolution = { reason: "no_target", operations, realNumHits: 0, numHits: 0, targetStates: [] };
    return resolved;
  }

  operations.push({ op: "reset_battler_hit_transients" });
  for (const targetIndex of targetIndexes) {
    const state = targetState.get(targetIndex) ?? { index: targetIndex, protected: false, unaffected: false, fainted: false, success: true };
    operations.push({ op: "success_check_target", targetIndex, success: state.success });
    if (!state.success) state.unaffected = true;
    targetState.set(targetIndex, state);
  }

  if (targetIndexes.length === 0 && Boolean(input.statusMove) && Boolean(input.canMagicCoat)) {
    if (magicCoater >= 0) operations.push({ op: "magic_coat_resolved", battlerIndex: magicCoater });
    else if (magicBouncer >= 0) operations.push({ op: "magic_bounce_resolved", battlerIndex: magicBouncer });
  }

  const numHits = Math.max(0, num(input.numHits, 1));
  operations.push({ op: "num_hits", count: numHits });
  let realNumHits = 0;
  let reason = "complete";
  const hitResults = Array.isArray(input.hitResults) ? input.hitResults : [];
  const processHitInputs = Array.isArray(input.processHitInputs) ? input.processHitInputs : [];
  const processHitDamageInputs = Array.isArray(input.processHitDamageInputs) ? input.processHitDamageInputs : [];
  const processHitPostDamageInputs = Array.isArray(input.processHitPostDamageInputs) ? input.processHitPostDamageInputs : [];
  const processHitTailInputs = Array.isArray(input.processHitTailInputs) ? input.processHitTailInputs : [];
  const processMoveHitResolutions = [];

  for (let i = 0; i < numHits; i += 1) {
    if (magicCoater >= 0 || magicBouncer >= 0) {
      reason = "bounce_pending";
      break;
    }
    let hit = hitResults[i] ?? { success: true };
    let processResolution = null;
    if (processHitInputs[i]) {
      processResolution = resolveProcessMoveHitPreludeCanonical({ ...processHitInputs[i], hitNum: i });
      processMoveHitResolutions.push(processResolution);
      operations.push({ op: "process_move_hit", hit: i, success: processResolution.proceed });
      for (const op of processResolution.operations) operations.push({ ...op, hit: i });
      hit = { ...hit, success: processResolution.proceed, targetStates: hit.targetStates ?? processResolution.allTargets };
    } else {
      operations.push({ op: "process_move_hit", hit: i, success: hit.success !== false });
    }
    if (hit.success !== false && processHitDamageInputs[i]) {
      const damageResolution = resolveProcessMoveHitDamageApplicationCanonical({ ...processHitDamageInputs[i], hitNum: i });
      if (processResolution) processResolution.damageApplication = damageResolution;
      else {
        processResolution = { proceed: true, reason: "damage_applied", operations: [], damageApplication: damageResolution };
        processMoveHitResolutions.push(processResolution);
      }
      operations.push({ op: "process_move_hit_damage_application", hit: i });
      for (const op of damageResolution.operations) operations.push({ ...op, hit: i });
      hit = { ...hit, targetStates: damageResolution.targets };
    }
    if (hit.success !== false && processHitPostDamageInputs[i]) {
      const postInput = processHitPostDamageInputs[i];
      const postResolution = resolveProcessMoveHitPostDamageCanonical({
        ...postInput,
        hitNum: i,
        targets: postInput.targets ?? hit.targetStates ?? [],
      });
      if (processResolution) processResolution.postDamage = postResolution;
      else {
        processResolution = { proceed: true, reason: "post_damage_complete", operations: [], postDamage: postResolution };
        processMoveHitResolutions.push(processResolution);
      }
      operations.push({ op: "process_move_hit_post_damage", hit: i });
      for (const op of postResolution.operations) operations.push({ ...op, hit: i });
      hit = { ...hit, userFainted: postResolution.user.fainted, targetStates: postResolution.targets };
    }
    if (hit.success !== false && processHitTailInputs[i]) {
      const tailInput = processHitTailInputs[i];
      const tailResolution = resolveProcessMoveHitTailCanonical({
        ...tailInput,
        hitNum: i,
        user: tailInput.user ?? processResolution?.postDamage?.user ?? {},
        targets: tailInput.targets ?? hit.targetStates ?? [],
      });
      if (processResolution) processResolution.tail = tailResolution;
      else {
        processResolution = { proceed: true, reason: "tail_complete", operations: [], tail: tailResolution };
        processMoveHitResolutions.push(processResolution);
      }
      operations.push({ op: "process_move_hit_tail", hit: i });
      for (const op of tailResolution.operations) operations.push({ ...op, hit: i });
      hit = {
        ...hit,
        userFainted: Boolean(hit.userFainted) || tailResolution.user.fainted,
        targetStates: tailResolution.targets,
        repeatHitRequested: tailResolution.repeatHitRequested,
      };
    }
    if (hit.success === false) {
      if (i === 0 && targetIndexes.length > 0) {
        let hasFailed = false;
        for (const targetIndex of targetIndexes) {
          const state = (hit.targetStates ?? []).find((t) => num(t.index, -1) === targetIndex) ?? targetState.get(targetIndex) ?? {};
          if (Boolean(state.protected)) continue;
          hasFailed = Boolean(state.unaffected);
          if (!Boolean(state.unaffected)) break;
        }
        resolved.userLastMoveFailed = hasFailed;
      }
      reason = "hit_failed";
      break;
    }
    realNumHits += 1;
    if (Boolean(hit.userFainted)) {
      reason = "user_fainted";
      break;
    }
    if (["SLEEP", "FROZEN"].includes(hit.userStatus)) {
      reason = "user_status";
      break;
    }
    if (targetIndexes.length > 0) {
      const states = Array.isArray(hit.targetStates) ? hit.targetStates : [];
      if (targetIndexes.every((targetIndex) => Boolean((states.find((t) => num(t.index, -1) === targetIndex) ?? targetState.get(targetIndex) ?? {}).fainted))) {
        reason = "all_targets_fainted";
        break;
      }
    }
  }

  resolved.realNumHits = realNumHits;
  resolved.numHits = numHits;
  if (processMoveHitResolutions.length > 0) resolved.processMoveHitResolutions = processMoveHitResolutions;
  resolved.hitLoopResolution = { reason, operations, realNumHits, numHits, targetStates: [...targetState.values()] };
  return resolved;
}
