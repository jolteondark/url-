export const PARTY_MASS_REVIVAL_ITEM_EFFECTS = Object.freeze({
  SACREDASH: Object.freeze({
    family: "party_mass_revival",
    target: "entire_player_party",
    useContext: "field_direct",
    eligibility: Object.freeze({
      requirePartyPokemon: true,
      requireAtLeastOneFaintedPartyPokemon: true,
    }),
    apply: Object.freeze({
      affectEveryFaintedPartyPokemon: true,
      healEachAffectedPokemonFully: true,
      cureEachAffectedPokemonStatus: true,
      useCanonicalPokemonHeal: true,
    }),
    consumeExactlyOnceOnSuccess: true,
    consumeOnFailure: false,
    battleUseAllowed: false,
  }),
});

export function getPartyMassRevivalItemEffect(itemId) {
  const id = String(itemId ?? "").toUpperCase();
  const effect = PARTY_MASS_REVIVAL_ITEM_EFFECTS[id];
  return effect ? { itemId: id, known: true, ...effect } : { itemId: id, known: false };
}
