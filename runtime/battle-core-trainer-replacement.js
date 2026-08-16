export const DEFAULT_CHOOSE_NEW_ENEMY_BODY_SHA256 = "716dfccad124840eca3d52dc3ee69e785eafc9b685f869e8772c28867f48a808";
export const CHOOSE_BEST_REPLACEMENT_BODY_SHA256 = "1cd8855a4392c294b56b1503c1f2f3826570b9648d8b23d54adea2b8c052a639";
export const RATE_REPLACEMENT_BODY_SHA256 = "30bb2a17f231b02d248b2ba290ded9d17f3097634887e0b2f610dc36ae7b6684";
function number(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function integer(value, fallback = -1) { const n = Number(value); return Number.isInteger(n) ? n : fallback; }
function rubyPositiveIntegerDivision(numerator, denominator) { return Math.floor(number(numerator) / Math.max(1, number(denominator, 1))); }
export function rateTrainerReplacementPokemonCanonical(input = {}) {
  let score = integer(input.baseScore, 100);
  const hp = Math.max(0, integer(input.hp, 0));
  const totalHp = Math.max(1, integer(input.totalHp, hp || 1));
  const hazard = Math.max(0, integer(input.entryHazardDamage, 0));
  if (hazard >= hp) score -= 50;
  else if (hazard > 0 && hp > 0) score -= rubyPositiveIntegerDivision(50 * hazard, hp);
  if (!input.hasHeavyDutyBoots && !input.airborne) {
    if (integer(input.toxicSpikesLayers, 0) > 0 && input.canBePoisoned) score -= 20;
    if (input.stickyWeb) score -= 15;
  }
  for (const foe of Array.isArray(input.foes) ? input.foes : []) {
    if (!foe?.hasLastMove || foe?.lastMoveStatus) continue;
    score -= rubyPositiveIntegerDivision(integer(foe.lastMovePower, 0) * integer(foe.effectiveness, 0), 5);
  }
  for (const move of Array.isArray(input.moves) ? input.moves : []) {
    const power = integer(move?.power, 0); const pp = integer(move?.pp, 0); const totalPp = integer(move?.totalPp, 0);
    if (power === 0 || (pp === 0 && totalPp > 0)) continue;
    for (const target of Array.isArray(move?.targets) ? move.targets : []) {
      if (target?.absorbed) continue;
      score += rubyPositiveIntegerDivision(power * integer(target?.effectiveness, 0), 10);
    }
  }
  const wishTurns = integer(input.wishTurns, 0); const wishAmount = Math.max(0, integer(input.wishAmount, 0));
  if (wishTurns > 0 && totalHp - hp > rubyPositiveIntegerDivision(wishAmount * 2, 3)) score += rubyPositiveIntegerDivision(20 * Math.min(totalHp - hp, wishAmount), totalHp);
  if (integer(input.perishSongCount, -1) === 1) score += 20;
  return score;
}
export function chooseBestTrainerReplacementCanonical(input = {}) {
  const party = Array.isArray(input.party) ? input.party : []; const terribleMoves = input.terribleMoves === undefined ? true : Boolean(input.terribleMoves);
  const reserveLast = Boolean(input.reserveLastPokemon); const inOrder = Boolean(input.usePokemonInOrder); const teamEnd = Math.max(0, integer(input.teamEndIndex, party.length)); const reserves = [];
  for (let i = 0; i < party.length; i += 1) {
    const candidate = party[i] ?? {}; if (!candidate.canSwitchIn) continue; if (!terribleMoves && candidate.allyAlreadySwitchingTo) continue;
    if (reserveLast && i === teamEnd - 1) { if (!terribleMoves || reserves.length > 0) continue; }
    reserves.push([i, 100]); if (inOrder && reserves.length > 0) break;
  }
  if (reserves.length === 0) return -1;
  for (const reserve of reserves) reserve[1] = rateTrainerReplacementPokemonCanonical({ baseScore: reserve[1], ...(party[reserve[0]]?.ratingInput ?? {}) });
  reserves.sort((a, b) => b[1] - a[1]);
  if (input.highSkill && !terribleMoves && reserves[0][1] < 100) return -1;
  return reserves[0][0];
}
export function resolveDefaultChooseNewEnemyCanonical(input = {}) {
  return { replacementPartyIndex: chooseBestTrainerReplacementCanonical({ ...input, terribleMoves: true }), sourceSymbol: "Battle::AI#pbDefaultChooseNewEnemy", sourceBodySha256: DEFAULT_CHOOSE_NEW_ENEMY_BODY_SHA256, chooserSourceSymbol: "Battle::AI#choose_best_replacement_pokemon", chooserSourceBodySha256: CHOOSE_BEST_REPLACEMENT_BODY_SHA256, ratingSourceSymbol: "Battle::AI#rate_replacement_pokemon", ratingSourceBodySha256: RATE_REPLACEMENT_BODY_SHA256 };
}
