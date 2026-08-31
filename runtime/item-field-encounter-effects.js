const EFFECTS = Object.freeze({
  BLACKFLUTE: Object.freeze({
    family: "wild_encounter_level_flute",
    target: "field",
    useContext: "field_direct",
    canonicalMechanicsGeneration: 9,
    apply: Object.freeze({
      setHigherLevelWildPokemon: true,
      setLowerLevelWildPokemon: false,
    }),
    consumable: false,
    consumeOnFailure: false,
  }),
  WHITEFLUTE: Object.freeze({
    family: "wild_encounter_level_flute",
    target: "field",
    useContext: "field_direct",
    canonicalMechanicsGeneration: 9,
    apply: Object.freeze({
      setLowerLevelWildPokemon: true,
      setHigherLevelWildPokemon: false,
    }),
    consumable: false,
    consumeOnFailure: false,
  }),
  HONEY: Object.freeze({
    family: "mapless_honey_wild_encounter",
    target: "field",
    useContext: "field_direct",
    eligibility: Object.freeze({ requireActivePartyPokemon: true }),
    apply: Object.freeze({
      selectTypeFromCurrentDayRevealedWildBranches: true,
      stableFallbackTypeFromCurrentDay: true,
      startOrdinaryCapturableWildBattle: true,
      battleModifier: 0,
      useFreshRandomizedSeed: true,
    }),
    consumeOnSuccess: true,
    consumeOnFailure: false,
  }),
});

export function getFieldEncounterItemEffect(itemId) {
  const id = String(itemId ?? "").toUpperCase();
  const effect = EFFECTS[id];
  return effect ? { itemId: id, known: true, ...effect } : { itemId: id, known: false };
}
