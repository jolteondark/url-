import { MAPLESS_BOUNDARY_LEADER_ORDER_V108 } from "./mapless-boundary-trial-leader-data-v108.js";

function normalizeLeader(value) {
  const id = String(value ?? "").toUpperCase();
  return MAPLESS_BOUNDARY_LEADER_ORDER_V108.includes(id) ? id : null;
}

export function shuffleBoundaryLeadersV108(array, randomBelow) {
  if (typeof randomBelow !== "function") throw new TypeError("randomBelow function is required");
  const result = [...array];
  for (let index = result.length - 1; index >= 1; index -= 1) {
    const swapIndex = Number(randomBelow(index + 1));
    if (!Number.isInteger(swapIndex) || swapIndex < 0 || swapIndex > index) {
      throw new RangeError(`randomBelow(${index + 1}) returned ${swapIndex}`);
    }
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export function refillBoundaryLeaderBagV108({ lastLeader = null, randomBelow } = {}) {
  const bag = shuffleBoundaryLeadersV108(MAPLESS_BOUNDARY_LEADER_ORDER_V108, randomBelow);
  const last = normalizeLeader(lastLeader);
  if (last && bag.length > 1 && bag[0] === last) {
    const swapIndex = bag.findIndex((id, index) => index > 0 && id !== last);
    if (swapIndex > 0) [bag[0], bag[swapIndex]] = [bag[swapIndex], bag[0]];
  }
  return bag;
}

export function ensurePendingBoundaryLeaderV108({ leaderBag = [], lastLeader = null, pendingLeader = null, randomBelow } = {}) {
  const pending = normalizeLeader(pendingLeader);
  if (pending) {
    return { pendingLeader: pending, leaderBag: leaderBag.map(normalizeLeader).filter(Boolean) };
  }
  let bag = Array.isArray(leaderBag) ? leaderBag.map(normalizeLeader).filter(Boolean) : [];
  bag = [...new Set(bag)];
  if (!bag.length) bag = refillBoundaryLeaderBagV108({ lastLeader, randomBelow });
  const next = bag.shift();
  if (!next) throw new Error("boundary leader bag produced no leader");
  return { pendingLeader: next, leaderBag: bag };
}
