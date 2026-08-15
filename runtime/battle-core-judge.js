const JUDGE_BODY_SHA256 = "316ffd89922dababcceded59e0622fb6d3367b3506a5ab9ca1e015651911354c";
const ABLE_COUNT_BODY_SHA256 = "d0aa1b28998ce37b76427a86084b4188946109692272538e49a4b468bbc5adf1";
const ALL_FAINTED_BODY_SHA256 = "d109101d7ef4e8428e133a517d47671469998f7c105a436a7c5bd2b2bf3cdef3";
const POKEMON_ABLE_BODY_SHA256 = "f93cfa2264cabacf48efeda92b62ec2bccc292534a3cad9e9dd40a8fd7a6bfb9";

function isAblePokemon(pokemon) {
  if (!pokemon || pokemon.present === false) return false;
  const isEgg = Boolean(pokemon.egg ?? pokemon.isEgg ?? false);
  const hp = Number(pokemon.hp ?? 0);
  return !isEgg && hp > 0;
}

function allFaintedFromParty(party) {
  return !party.some(isAblePokemon);
}

export function resolveJudgeCanonical(input = {}) {
  const hasParties = Array.isArray(input.playerParty) && Array.isArray(input.foeParty);
  const playerAllFainted = hasParties
    ? allFaintedFromParty(input.playerParty)
    : Boolean(input.playerAllFainted);
  const foeAllFainted = hasParties
    ? allFaintedFromParty(input.foeParty)
    : Boolean(input.foeAllFainted);
  let decision = 0;
  if (playerAllFainted && foeAllFainted) decision = Number(input.drawDecision ?? 5);
  else if (playerAllFainted) decision = 2;
  else if (foeAllFainted) decision = 1;
  return {
    decision,
    playerAllFainted,
    foeAllFainted,
    sourceComplete: hasParties,
    sourceSymbol: "Battle#pbJudge",
    sourceBodySha256: JUDGE_BODY_SHA256,
    ableCountBodySha256: ABLE_COUNT_BODY_SHA256,
    allFaintedBodySha256: ALL_FAINTED_BODY_SHA256,
    pokemonAbleBodySha256: POKEMON_ABLE_BODY_SHA256,
  };
}
