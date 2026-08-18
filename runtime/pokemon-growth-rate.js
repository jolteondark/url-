export const POKEMON_GROWTH_RATE_IDS = Object.freeze([
  "Medium",
  "Erratic",
  "Fluctuating",
  "Parabolic",
  "Fast",
  "Slow",
]);

function levelNumber(level) {
  const value = Number(level);
  if (!Number.isInteger(value) || value < 1 || value > 100) {
    throw new RangeError(`level must be an integer from 1 to 100: ${level}`);
  }
  return value;
}

function growthRateId(growthRate) {
  const id = String(growthRate ?? "");
  if (!POKEMON_GROWTH_RATE_IDS.includes(id)) throw new RangeError(`unknown growth rate: ${id}`);
  return id;
}

export function minimumExpForLevel(growthRate, level) {
  const id = growthRateId(growthRate);
  const n = levelNumber(level);
  if (n === 1) return 0;
  const cube = n ** 3;
  switch (id) {
    case "Medium":
      return cube;
    case "Erratic":
      if (n <= 50) return Math.floor((cube * (100 - n)) / 50);
      if (n <= 68) return Math.floor((cube * (150 - n)) / 100);
      if (n <= 98) return Math.floor((cube * Math.floor((1911 - (10 * n)) / 3)) / 500);
      return Math.floor((cube * (160 - n)) / 100);
    case "Fluctuating":
      if (n <= 15) return Math.floor((cube * (24 + Math.floor((n + 1) / 3))) / 50);
      if (n <= 35) return Math.floor((cube * (14 + n)) / 50);
      return Math.floor((cube * (32 + Math.floor(n / 2))) / 50);
    case "Parabolic":
      return Math.max(0, Math.floor((cube * 6) / 5) - (15 * (n ** 2)) + (100 * n) - 140);
    case "Fast":
      return Math.floor((cube * 4) / 5);
    case "Slow":
      return Math.floor((cube * 5) / 4);
    default:
      throw new RangeError(`unknown growth rate: ${id}`);
  }
}

export function maximumExpForGrowthRate(growthRate) {
  return minimumExpForLevel(growthRate, 100);
}

export function levelFromExp(growthRate, exp) {
  const id = growthRateId(growthRate);
  const value = Number(exp);
  if (!Number.isInteger(value) || value < 0) throw new RangeError(`exp must be a non-negative integer: ${exp}`);
  if (value >= maximumExpForGrowthRate(id)) return 100;
  let low = 1;
  let high = 100;
  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2);
    if (value >= minimumExpForLevel(id, mid)) low = mid;
    else high = mid - 1;
  }
  return low;
}
