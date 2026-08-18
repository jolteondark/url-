export const MAPLESS_GLOBAL_EXP_RATE = 0.5;
export const MAPLESS_ACQUISITION_EXP_MULTIPLIER = 1.0;

const LEVEL_GAP_MULTIPLIERS = Object.freeze({
  1: 0.90,
  2: 0.80,
  3: 0.70,
  4: 0.60,
  5: 0.50,
  6: 0.40,
});

function asNonNegativeInt(value, field) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) throw new RangeError(`${field} must be a non-negative integer`);
  return n;
}

export function maplessLevelGapMultiplier(gainerLevel, defeatedLevel) {
  const gainer = asNonNegativeInt(gainerLevel, "gainerLevel");
  const defeated = asNonNegativeInt(defeatedLevel, "defeatedLevel");
  const gap = gainer - defeated;
  if (gap <= 0) return 1.0;
  return LEVEL_GAP_MULTIPLIERS[gap] ?? 0.30;
}

export function calculateMaplessBattleExp(input) {
  const defeatedLevel = asNonNegativeInt(input.defeatedLevel, "defeatedLevel");
  const baseExp = asNonNegativeInt(input.baseExp, "baseExp");
  const gainerLevel = asNonNegativeInt(input.gainerLevel, "gainerLevel");
  let exp = defeatedLevel * baseExp;
  if (input.moreExpFromTrainerPokemon && input.trainerBattle) exp = Math.floor(exp * 1.5);
  if (input.scaledExpFormula) {
    exp = Math.floor(exp / 5);
    let levelAdjust = ((2 * defeatedLevel) + 10.0) / (gainerLevel + defeatedLevel + 10.0);
    levelAdjust **= 5;
    levelAdjust = Math.sqrt(levelAdjust);
    exp = Math.floor(exp * levelAdjust);
    exp += 1;
  } else {
    exp = Math.floor(exp / 7);
  }
  exp = Math.floor(exp * MAPLESS_GLOBAL_EXP_RATE);
  exp = Math.floor(exp * MAPLESS_ACQUISITION_EXP_MULTIPLIER);
  exp = Math.floor(exp * maplessLevelGapMultiplier(gainerLevel, defeatedLevel));
  return exp <= 0 ? 1 : exp;
}
