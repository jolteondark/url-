const EVOLUTION_STONE_ITEMS = Object.freeze([
  "FIRESTONE", "THUNDERSTONE", "WATERSTONE", "LEAFSTONE", "MOONSTONE",
  "SUNSTONE", "DUSKSTONE", "DAWNSTONE", "SHINYSTONE", "ICESTONE",
  "SWEETAPPLE", "TARTAPPLE", "CRACKEDPOT", "CHIPPEDPOT",
  "GALARICACUFF", "GALARICAWREATH", "BLACKAUGURITE", "PEATBLOCK",
  "LINKINGCORD", "AUSPICIOUSARMOR", "MALICIOUSARMOR",
  "SCROLLOFDARKNESS", "SCROLLOFWATERS", "SYRUPYAPPLE",
  "UNREMARKABLETEACUP", "MASTERPIECETEACUP", "METALALLOY",
]);

const evolutionStoneEffect = Object.freeze({
  family: "item_evolution",
  target: "selected_party_pokemon",
  eligibility: Object.freeze({ requireMatchingCanonicalItemEvolution: true }),
  apply: Object.freeze({ useCanonicalEvolutionSequence: true }),
  consumeOnFailure: false,
});

const EFFECTS = Object.freeze({
  ...Object.fromEntries(EVOLUTION_STONE_ITEMS.map((id) => [id, evolutionStoneEffect])),
  RARECANDY: Object.freeze({
    family: "level_up_item",
    target: "selected_party_pokemon",
    eligibility: Object.freeze({ requireLevelBelowMaximum: true }),
    apply: Object.freeze({ levelDelta: 1, useCanonicalLevelUpSequence: true }),
    consumeOnFailure: false,
  }),
  GRACIDEA: Object.freeze({
    family: "pokemon_form_change",
    target: "selected_party_pokemon",
    eligibility: Object.freeze({
      speciesRequired: "SHAYMIN",
      requireNotFainted: true,
      statusesDisallowed: Object.freeze(["FROZEN", "FROSTBITE"]),
      requireNotNight: true,
    }),
    apply: Object.freeze({ toggleForms: Object.freeze([0, 1]), useCanonicalSetForm: true }),
    consumable: false,
    consumeOnFailure: false,
  }),
  REVEALGLASS: Object.freeze({
    family: "pokemon_form_change",
    target: "selected_party_pokemon",
    eligibility: Object.freeze({
      requireSpeciesFlag: "ForcesOfNature",
      requireNotFainted: true,
    }),
    apply: Object.freeze({ toggleForms: Object.freeze([0, 1]), useCanonicalSetForm: true }),
    consumable: false,
    consumeOnFailure: false,
  }),
  METEORITE: Object.freeze({
    family: "pokemon_form_change",
    target: "selected_party_pokemon",
    eligibility: Object.freeze({
      speciesRequired: "DEOXYS",
      requireNotFainted: true,
      requireDestinationFormDifferent: true,
    }),
    apply: Object.freeze({ chooseFormFrom: Object.freeze([0, 1, 2, 3]), useCanonicalSetForm: true }),
    consumable: false,
    consumeOnFailure: false,
  }),
  ABILITYCAPSULE: Object.freeze({
    family: "ability_mutation",
    target: "selected_party_pokemon",
    eligibility: Object.freeze({
      requireNormalAbilitySlots: Object.freeze([0, 1]),
      hiddenAbilityDisallowed: true,
      speciesDisallowed: Object.freeze(["ZYGARDE"]),
    }),
    apply: Object.freeze({ toggleAbilityIndex: Object.freeze([0, 1]) }),
    consumeOnFailure: false,
  }),
  ABILITYPATCH: Object.freeze({
    family: "ability_mutation",
    target: "selected_party_pokemon",
    eligibility: Object.freeze({
      requireDestinationAbility: true,
      speciesDisallowed: Object.freeze(["ZYGARDE"]),
    }),
    apply: Object.freeze({
      normalAbilityToHiddenIndex: 2,
      hiddenAbilityToNormalIndex: 0,
    }),
    consumeOnFailure: false,
  }),
  LUMBERRY: Object.freeze({
    family: "medicine_status_healing",
    target: "holder_battler",
    eligibility: Object.freeze({
      requireCanConsumeBerryUnlessForced: true,
      requirePrimaryStatusOrConfusion: true,
    }),
    apply: Object.freeze({
      curePrimaryStatus: true,
      cureConfusion: true,
    }),
    consumeOnFailure: false,
  }),
  PERSIMBERRY: Object.freeze({
    family: "medicine_status_healing",
    target: "holder_battler",
    eligibility: Object.freeze({
      requireCanConsumeBerryUnlessForced: true,
      requireConfusion: true,
    }),
    apply: Object.freeze({ cureConfusion: true }),
    consumeOnFailure: false,
  }),
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
