import { storePokemonHandoff } from "./party-storage-handoff.js";

export function routeCaughtQueueToPartyStorage(state, caughtQueue, options = {}) {
  if (!Array.isArray(caughtQueue)) throw new TypeError("caughtQueue must be an array");
  let currentState = state;
  const routed = [];
  const operations = [{ op: "receive_caught_queue", count: caughtQueue.length }];
  for (let index = 0; index < caughtQueue.length; index += 1) {
    const result = storePokemonHandoff(currentState, caughtQueue[index], options);
    if (result.result === "full") {
      operations.push({ op: "route_blocked_full", index });
      return { state: currentState, routed, remainingQueue: caughtQueue.slice(index), operations };
    }
    currentState = result.state;
    routed.push({ index, result: result.result, partyIndex: result.partyIndex, storedBox: result.storedBox, storedSlot: result.storedSlot });
    operations.push(...result.operations.filter((entry) => entry.op !== "record_first_moves"), { op: "consume_caught_queue_entry", index });
  }
  operations.push({ op: "clear_caught_queue" });
  return { state: currentState, routed, remainingQueue: [], operations };
}
