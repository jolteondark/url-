// Canonical Mapless v0.9.108 Battle::Battler#pbSpeed projection.
// Source: Data/Scripts.rxdata, Battle_Battler (script index 160).
// Body SHA-256: e2d093937295bd7422548e7fa7cd36cff05d41a66a0e329c00ca8bf93b0b28c3

const STAT_STAGE_MULTIPLIERS = Object.freeze([2, 2, 2, 2, 2, 2, 2, 3, 4, 5, 6, 7, 8]);
const STAT_STAGE_DIVISORS = Object.freeze([8, 7, 6, 5, 4, 3, 2, 2, 2, 2, 2, 2, 2]);

function finiteMultiplier(value, field) {
  const number = Number(value ?? 1);
  if (!Number.isFinite(number) || number < 0) throw new TypeError(`${field} must be a non-negative finite number`);
  return number;
}

export function resolveBattleSpeedCanonical(input = {}) {
  if (input.fainted) return 1;
  const baseSpeed = Number(input.baseSpeed);
  if (!Number.isInteger(baseSpeed) || baseSpeed < 0) throw new TypeError("baseSpeed must be a non-negative integer");
  const speedStage = Number(input.speedStage ?? 0);
  if (!Number.isInteger(speedStage) || speedStage < -6 || speedStage > 6) throw new RangeError("speedStage must be an integer from -6 to 6");

  const stageIndex = speedStage + 6;
  const stagedSpeed = Math.floor((baseSpeed * STAT_STAGE_MULTIPLIERS[stageIndex]) / STAT_STAGE_DIVISORS[stageIndex]);
  let speedMultiplier = finiteMultiplier(input.abilityMultiplier, "abilityMultiplier");
  speedMultiplier *= finiteMultiplier(input.itemMultiplier, "itemMultiplier");
  if (input.tailwind) speedMultiplier *= 2;
  if (input.swamp) speedMultiplier /= 2;
  if (String(input.status ?? "NONE") === "PARALYSIS" && !input.quickFeetActive) {
    speedMultiplier /= Number(input.mechanicsGeneration ?? 9) >= 7 ? 2 : 4;
  }
  speedMultiplier *= finiteMultiplier(input.badgeMultiplier, "badgeMultiplier");
  return Math.max(Math.round(stagedSpeed * speedMultiplier), 1);
}

export function resolveOrdinaryPokemonSpeedCanonical(pokemon = {}) {
  return resolveBattleSpeedCanonical({
    baseSpeed: pokemon?.stats?.SPEED,
    speedStage: 0,
    status: pokemon?.status ?? "NONE",
    quickFeetActive: String(pokemon?.ability_id ?? "") === "QUICKFEET",
    mechanicsGeneration: 9,
  });
}

export const BATTLE_SPEED_CANONICAL_PROVENANCE = Object.freeze({
  sourceSymbol: "Battle::Battler#pbSpeed",
  sourceBodySha256: "e2d093937295bd7422548e7fa7cd36cff05d41a66a0e329c00ca8bf93b0b28c3",
});
