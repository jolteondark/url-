const EFFECTS = Object.freeze({
  DIREHIT: Object.freeze({
    family: "focus_energy",
    target: "selected_ally_battler",
    eligibility: Object.freeze({ focusEnergyBelow: 1 }),
    apply: Object.freeze({ setFocusEnergy: 2 }),
    consumeOnFailure: false,
  }),
  DIREHIT2: Object.freeze({
    family: "focus_energy",
    target: "selected_ally_battler",
    eligibility: Object.freeze({ focusEnergyBelow: 2 }),
    apply: Object.freeze({ setFocusEnergy: 2 }),
    consumeOnFailure: false,
  }),
  DIREHIT3: Object.freeze({
    family: "focus_energy",
    target: "selected_ally_battler",
    eligibility: Object.freeze({ focusEnergyBelow: 3 }),
    apply: Object.freeze({ setFocusEnergy: 3 }),
    consumeOnFailure: false,
  }),
  GUARDSPEC: Object.freeze({
    family: "side_mist",
    target: "selected_ally_battler_own_side",
    eligibility: Object.freeze({ mistTurnsEqual: 0 }),
    apply: Object.freeze({ setMistTurns: 5 }),
    consumeOnFailure: false,
  }),
  REPEL: Object.freeze({
    family: "repel_steps",
    target: "field",
    eligibility: Object.freeze({ activeRepelStepsEqual: 0 }),
    apply: Object.freeze({ setRepelSteps: 100 }),
    consumeOnFailure: false,
  }),
  SUPERREPEL: Object.freeze({
    family: "repel_steps",
    target: "field",
    eligibility: Object.freeze({ activeRepelStepsEqual: 0 }),
    apply: Object.freeze({ setRepelSteps: 200 }),
    consumeOnFailure: false,
  }),
  MAXREPEL: Object.freeze({
    family: "repel_steps",
    target: "field",
    eligibility: Object.freeze({ activeRepelStepsEqual: 0 }),
    apply: Object.freeze({ setRepelSteps: 250 }),
    consumeOnFailure: false,
  }),
});

export function getCanonicalBlockedItemEffectMapping(itemId) {
  const id = String(itemId ?? "").toUpperCase();
  const effect = EFFECTS[id];
  return effect ? { itemId: id, known: true, ...effect } : { itemId: id, known: false };
}
