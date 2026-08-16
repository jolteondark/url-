import { createRubyRandomPicker } from "./ruby-mt19937-random.js";

const PB_CALCULATE_PRIORITY_BODY_SHA256 = "aa6b926ce5e268005cb47b94df5f9caab09ef04a700268814e717dc2b0103248";

export function buildCanonicalPriorityRandomOrder(maxBattlerIndex, randomSeed) {
  const maxIndex = Number(maxBattlerIndex);
  if (!Number.isInteger(maxIndex) || maxIndex < -1) throw new RangeError("maxBattlerIndex must be an integer >= -1");
  const randomOrder = Array.from({ length: maxIndex + 1 }, (_, index) => index);
  if (randomOrder.length <= 1) return randomOrder;
  const pick = createRubyRandomPicker(randomSeed);
  for (let i = 0; i < randomOrder.length - 1; i += 1) {
    const r = i + pick(randomOrder.length - i);
    [randomOrder[i], randomOrder[r]] = [randomOrder[r], randomOrder[i]];
  }
  return randomOrder;
}

function normalizedEntry(source = {}, index = 0, randomOrder = null) {
  const battlerIndex = Number(source.battlerIndex ?? source.index ?? index);
  const tieBreaker = Array.isArray(randomOrder)
    ? Number(randomOrder[battlerIndex] ?? source.tieBreaker ?? index)
    : Number(source.tieBreaker ?? index);
  return {
    battlerIndex,
    actionIndex: Number(source.actionIndex ?? index),
    speed: Number(source.speed ?? 0),
    abilitySubPriority: Number(source.abilitySubPriority ?? 0),
    itemSubPriority: Number(source.itemSubPriority ?? 0),
    finalSubPriority: 0,
    movePriority: Number(source.movePriority ?? 0),
    tieBreaker,
    fainted: Boolean(source.fainted),
    priorityAbility: false,
    priorityItem: false,
  };
}

function applySubPriority(entry) {
  entry.priorityAbility = false;
  entry.priorityItem = false;
  let sub = Number(entry.abilitySubPriority ?? 0);
  const item = Number(entry.itemSubPriority ?? 0);
  if ((sub === 0 && item !== 0) || (sub < 0 && item >= 1)) {
    sub = item;
    entry.priorityItem = true;
  } else if (sub !== 0) {
    entry.priorityAbility = true;
  }
  entry.finalSubPriority = sub;
}

function sortPriority(entries, trickRoom) {
  entries.sort((a, b) => {
    if (a.movePriority !== b.movePriority) return b.movePriority - a.movePriority;
    if (a.finalSubPriority !== b.finalSubPriority) return b.finalSubPriority - a.finalSubPriority;
    if (a.speed !== b.speed) return trickRoom ? a.speed - b.speed : b.speed - a.speed;
    return b.tieBreaker - a.tieBreaker;
  });
}

export function resolvePriorityCanonical(input = {}) {
  const fullCalc = input.fullCalc !== false;
  const trickRoom = Boolean(input.trickRoom);
  const operations = [];
  let entries;
  let needRearranging = false;

  if (fullCalc || !input.previousState) {
    const sourceEntries = Array.isArray(input.entries) ? input.entries : [];
    const maxBattlerIndex = sourceEntries.reduce((maximum, entry, index) => {
      const battlerIndex = Number(entry?.battlerIndex ?? entry?.index ?? index);
      return Number.isInteger(battlerIndex) ? Math.max(maximum, battlerIndex) : maximum;
    }, -1);
    const generatedRandomOrder = !Array.isArray(input.randomOrder) && input.randomSeed !== undefined && input.randomSeed !== null
      ? buildCanonicalPriorityRandomOrder(maxBattlerIndex, input.randomSeed)
      : null;
    const randomOrder = Array.isArray(input.randomOrder) ? input.randomOrder : generatedRandomOrder;
    entries = sourceEntries.map((entry, index) => normalizedEntry(entry, index, randomOrder));
    needRearranging = true;
    operations.push({
      op: "priority_full_recalculate",
      trickRoom,
      ...(generatedRandomOrder ? {
        randomOrder: [...generatedRandomOrder],
        randomSeed: Number(input.randomSeed) & 0x7fffffff,
        sourceSymbol: "Battle#pbCalculatePriority",
        sourceBodySha256: PB_CALCULATE_PRIORITY_BODY_SHA256,
      } : {}),
    });
  } else {
    const previous = structuredClone(input.previousState);
    entries = Array.isArray(previous.entries) ? previous.entries : [];
    needRearranging = Boolean(previous.trickRoom) !== trickRoom;
    if (needRearranging) operations.push({ op: "priority_trick_room_changed", trickRoom });
    const updates = new Map((Array.isArray(input.entries) ? input.entries : []).map((entry) => [
      Number(entry.battlerIndex ?? entry.index ?? -1), entry,
    ]));
    const restricted = Array.isArray(input.indexArray) ? new Set(input.indexArray.map(Number)) : null;
    for (const entry of entries) {
      if (restricted && !restricted.has(Number(entry.battlerIndex))) continue;
      const update = updates.get(Number(entry.battlerIndex));
      if (!update) continue;
      const speed = Number(update.speed ?? entry.speed);
      const movePriority = Number(update.movePriority ?? entry.movePriority);
      if (speed !== entry.speed || movePriority !== entry.movePriority) needRearranging = true;
      entry.speed = speed;
      entry.movePriority = movePriority;
      entry.fainted = update.fainted === undefined ? entry.fainted : Boolean(update.fainted);
      operations.push({ op: "priority_recheck", battler: entry.battlerIndex, speed, movePriority });
    }
  }

  for (const entry of entries) applySubPriority(entry);
  if (needRearranging) sortPriority(entries, trickRoom);
  const order = entries.filter((entry) => !entry.fainted).map((entry) => entry.actionIndex);
  const speedOrder = [...entries]
    .sort((a, b) => b.speed - a.speed || b.tieBreaker - a.tieBreaker)
    .map((entry) => entry.actionIndex);
  operations.push({ op: "priority_order", order, rearranged: needRearranging });
  return { trickRoom, entries, order, speedOrder, needRearranging, operations };
}

export function calculatePriorityCanonical(entries = [], { trickRoom = false, onlySpeedSort = false, randomOrder = null, randomSeed = null } = {}) {
  const state = resolvePriorityCanonical({ fullCalc: true, entries, trickRoom, randomOrder, randomSeed });
  return { order: onlySpeedSort ? state.speedOrder : state.order, entries: state.entries };
}

export const PRIORITY_CANONICAL_PROVENANCE = Object.freeze({
  calculatePriorityBodySha256: PB_CALCULATE_PRIORITY_BODY_SHA256,
});
