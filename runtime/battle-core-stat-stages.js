const STAGE_MIN = -6;
const STAGE_MAX = 6;

export const BATTLE_STAT_STAGE_KEYS = Object.freeze([
  "ATTACK", "DEFENSE", "SPECIAL_ATTACK", "SPECIAL_DEFENSE", "SPEED", "ACCURACY", "EVASION",
]);

const TOKEN_TO_STAT = Object.freeze({
  Attack: "ATTACK", Atk: "ATTACK",
  Defense: "DEFENSE", Def: "DEFENSE",
  SpAtk: "SPECIAL_ATTACK",
  SpDef: "SPECIAL_DEFENSE",
  Speed: "SPEED", Spd: "SPEED",
  Accuracy: "ACCURACY", Acc: "ACCURACY",
  Evasion: "EVASION", Eva: "EVASION",
});
const STAT_TOKEN = /^(SpAtk|SpDef|Accuracy|Evasion|Attack|Defense|Speed|Atk|Def|Spd|Acc|Eva)/;
const EFFECT_PREFIX = /(Raise|Lower)(User|Target)/g;

export function clampBattleStatStageCanonical(value) {
  const stage = Math.trunc(Number(value ?? 0));
  if (!Number.isFinite(stage)) throw new TypeError("battle stat stage must be finite");
  return Math.max(STAGE_MIN, Math.min(STAGE_MAX, stage));
}

export function createBattleStatStagesCanonical(seed = {}) {
  const result = {};
  for (const key of BATTLE_STAT_STAGE_KEYS) result[key] = clampBattleStatStageCanonical(seed?.[key] ?? 0);
  return result;
}

export function createBattleStatStageStateCanonical(seed = {}) {
  const input = seed && typeof seed === "object" && !Array.isArray(seed) ? seed : {};
  return {
    0: createBattleStatStagesCanonical(input[0] ?? input.player ?? {}),
    1: createBattleStatStagesCanonical(input[1] ?? input.foe ?? input.opponent ?? {}),
  };
}

export function resetBattleStatStagesForBattlerCanonical(state, battlerIndex) {
  const next = createBattleStatStageStateCanonical(state);
  next[Number(battlerIndex)] = createBattleStatStagesCanonical();
  return next;
}

function tokenizeStats(text) {
  const stats = [];
  let rest = text;
  while (rest.length > 0) {
    const match = rest.match(STAT_TOKEN);
    if (!match) break;
    stats.push(TOKEN_TO_STAT[match[1]]);
    rest = rest.slice(match[1].length);
  }
  return { stats, rest };
}

function parseStageSegment(segment, sign, subject) {
  if (segment.startsWith("MainStats")) {
    const amount = Number(segment.slice("MainStats".length, "MainStats".length + 1));
    if (!Number.isInteger(amount) || amount < 1 || amount > 3) return [];
    return ["ATTACK", "DEFENSE", "SPECIAL_ATTACK", "SPECIAL_DEFENSE", "SPEED"]
      .map((stat) => ({ subject, stat, delta: sign * amount }));
  }

  const changes = [];
  let cursor = segment;
  while (cursor.length > 0) {
    const token = cursor.match(STAT_TOKEN);
    if (!token) break;
    const stat = TOKEN_TO_STAT[token[1]];
    cursor = cursor.slice(token[1].length);
    const amountMatch = cursor.match(/^([123])/);
    if (amountMatch) {
      changes.push({ subject, stat, delta: sign * Number(amountMatch[1]) });
      cursor = cursor.slice(1);
      continue;
    }
    const grouped = tokenizeStats(token[1] + cursor);
    const groupedAmount = grouped.rest.match(/^([123])/);
    if (!groupedAmount || grouped.stats.length === 0) break;
    const amount = Number(groupedAmount[1]);
    return grouped.stats.map((groupedStat) => ({ subject, stat: groupedStat, delta: sign * amount }));
  }
  return changes;
}

export function resolveBattleStatStageChangesCanonical(functionCode) {
  const code = String(functionCode ?? "");
  const markers = [...code.matchAll(EFFECT_PREFIX)];
  const changes = [];
  for (let index = 0; index < markers.length; index += 1) {
    const marker = markers[index];
    const start = Number(marker.index) + marker[0].length;
    const end = index + 1 < markers.length ? Number(markers[index + 1].index) : code.length;
    const segment = code.slice(start, end);
    if (/^(RandomStat|CriticalHitRate)/.test(segment) || /Or\d/.test(segment)) continue;
    changes.push(...parseStageSegment(segment, marker[1] === "Raise" ? 1 : -1, marker[2].toLowerCase()));
  }
  return changes;
}

export function applyBattleStatStageChangesCanonical(state, changes, userBattlerIndex, targetBattlerIndex) {
  const next = createBattleStatStageStateCanonical(state);
  const applied = [];
  for (const change of changes ?? []) {
    const battlerIndex = change.subject === "user" ? Number(userBattlerIndex) : Number(targetBattlerIndex);
    if (!(battlerIndex in next) || !BATTLE_STAT_STAGE_KEYS.includes(change.stat)) continue;
    const before = next[battlerIndex][change.stat];
    const after = clampBattleStatStageCanonical(before + Number(change.delta ?? 0));
    next[battlerIndex][change.stat] = after;
    applied.push({
      battlerIndex,
      stat: change.stat,
      requestedDelta: Number(change.delta ?? 0),
      appliedDelta: after - before,
      before,
      after,
    });
  }
  return { state: next, applied };
}

export function injectBattleStatStagesIntoActionCanonical(action, state) {
  if (!action || action.kind !== "move") return action;
  const next = structuredClone(action);
  const stages = createBattleStatStageStateCanonical(state);
  const user = stages[Number(next.battlerIndex)] ?? createBattleStatStagesCanonical();
  const target = stages[Number(next.targetBattlerIndex)] ?? createBattleStatStagesCanonical();
  if (next.accuracyInput) {
    next.accuracyInput = {
      ...next.accuracyInput,
      accuracyStage: user.ACCURACY,
      evasionStage: target.EVASION,
    };
  }
  if (next.damageInput) {
    const special = Boolean(next.damageInput.damageMultiplierInput?.specialMove);
    next.damageInput = {
      ...next.damageInput,
      attackStageIndex: 6 + user[special ? "SPECIAL_ATTACK" : "ATTACK"],
      defenseStageIndex: 6 + target[special ? "SPECIAL_DEFENSE" : "DEFENSE"],
    };
  }
  next.speedStage = user.SPEED;
  return next;
}

export function battleStatStageEffectSucceededCanonical(action) {
  if (!action || action.kind !== "move" || !action.statStageEffectInput) return false;
  if (action.moveSkipped || action.lastMoveFailed) return false;
  if (action.tryUseMoveResolution && action.tryUseMoveResolution.success === false) return false;
  if (action.accuracyHit === false) return false;
  if (action.statStageEffectInput.moveCategory !== "Status") {
    return (action.secondaryEffectInputs ?? []).some((effect) =>
      effect?.functionCode === action.statStageEffectInput.functionCode && effect?.triggered === true
    );
  }
  return true;
}
