import { SAFARI_MOVE_LABELS, SAFARI_MOVE_MASTERS } from "./safari-playable-data.js";

function presentationFor(id) {
  const master = SAFARI_MOVE_MASTERS[id];
  if (!master) return undefined;
  return Object.freeze({
    name: SAFARI_MOVE_LABELS[id] ?? master.name,
    power: master.power,
    accuracy: master.accuracy,
    priority: master.priority,
    totalPp: master.total_pp,
    type: master.type ?? null,
    category: master.category ?? null,
  });
}

// Preview reads this object after GENERAL demand installation. A live Proxy
// avoids freezing bootstrap placeholder facts into the move buttons while
// keeping the heavyweight master projection off the startup path.
export const SAFARI_MOVE_PRESENTATION = new Proxy(Object.create(null), {
  get(_target, property) {
    if (typeof property !== "string") return undefined;
    return presentationFor(property);
  },
  has(_target, property) {
    return typeof property === "string" && Object.prototype.hasOwnProperty.call(SAFARI_MOVE_MASTERS, property);
  },
  ownKeys() {
    return Reflect.ownKeys(SAFARI_MOVE_MASTERS);
  },
  getOwnPropertyDescriptor(_target, property) {
    if (typeof property !== "string" || !Object.prototype.hasOwnProperty.call(SAFARI_MOVE_MASTERS, property)) return undefined;
    return { configurable: true, enumerable: true };
  },
});
