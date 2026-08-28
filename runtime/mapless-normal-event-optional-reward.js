// Shared result projection for v0.9.108 normal-event rewards that are
// optional with respect to event completion.
//
// The canonical event resolver remains authoritative for whether the event is
// finished. Bag capacity/mutation remains authoritative in the existing reward
// transaction owner. This helper only projects those two results together so
// Safari/UI code does not accidentally turn a failed optional reward into a
// retryable event.

export function projectMaplessNormalEventOptionalReward({
  ownerResult,
  rewardResult = null,
} = {}) {
  const completed = ownerResult?.result === true
    && ownerResult?.event?.normal_resolved === true;
  if (!completed) {
    throw new Error("optional reward projection requires a completed canonical event");
  }

  const granted = rewardResult?.success === true;
  return Object.freeze({
    completed: true,
    rewardGranted: granted,
    rewardSkipped: !granted,
    rewardReason: granted ? null : String(rewardResult?.reason ?? "reward_unavailable"),
    rewardOperations: Array.isArray(rewardResult?.operations)
      ? rewardResult.operations.map((operation) => structuredClone(operation))
      : [],
  });
}
