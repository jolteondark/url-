// Pokémon Essentials v21.1 / source-v0.9.108 nature stat modifiers.
// recalculatePokemonStats expects percentage-point deltas, i.e. +10 / -10.
const NATURE_STAT_CHANGES = Object.freeze({
  HARDY: Object.freeze([]),
  LONELY: Object.freeze([["ATTACK", 10], ["DEFENSE", -10]]),
  BRAVE: Object.freeze([["ATTACK", 10], ["SPEED", -10]]),
  ADAMANT: Object.freeze([["ATTACK", 10], ["SPECIAL_ATTACK", -10]]),
  NAUGHTY: Object.freeze([["ATTACK", 10], ["SPECIAL_DEFENSE", -10]]),
  BOLD: Object.freeze([["DEFENSE", 10], ["ATTACK", -10]]),
  DOCILE: Object.freeze([]),
  RELAXED: Object.freeze([["DEFENSE", 10], ["SPEED", -10]]),
  IMPISH: Object.freeze([["DEFENSE", 10], ["SPECIAL_ATTACK", -10]]),
  LAX: Object.freeze([["DEFENSE", 10], ["SPECIAL_DEFENSE", -10]]),
  TIMID: Object.freeze([["SPEED", 10], ["ATTACK", -10]]),
  HASTY: Object.freeze([["SPEED", 10], ["DEFENSE", -10]]),
  SERIOUS: Object.freeze([]),
  JOLLY: Object.freeze([["SPEED", 10], ["SPECIAL_ATTACK", -10]]),
  NAIVE: Object.freeze([["SPEED", 10], ["SPECIAL_DEFENSE", -10]]),
  MODEST: Object.freeze([["SPECIAL_ATTACK", 10], ["ATTACK", -10]]),
  MILD: Object.freeze([["SPECIAL_ATTACK", 10], ["DEFENSE", -10]]),
  QUIET: Object.freeze([["SPECIAL_ATTACK", 10], ["SPEED", -10]]),
  BASHFUL: Object.freeze([]),
  RASH: Object.freeze([["SPECIAL_ATTACK", 10], ["SPECIAL_DEFENSE", -10]]),
  CALM: Object.freeze([["SPECIAL_DEFENSE", 10], ["ATTACK", -10]]),
  GENTLE: Object.freeze([["SPECIAL_DEFENSE", 10], ["DEFENSE", -10]]),
  SASSY: Object.freeze([["SPECIAL_DEFENSE", 10], ["SPEED", -10]]),
  CAREFUL: Object.freeze([["SPECIAL_DEFENSE", 10], ["SPECIAL_ATTACK", -10]]),
  QUIRKY: Object.freeze([]),
});

export function safariNatureStatChanges(natureId) {
  const id = String(natureId ?? "HARDY").toUpperCase();
  const changes = NATURE_STAT_CHANGES[id];
  if (!changes) throw new RangeError(`unknown canonical nature: ${id}`);
  return changes.map(([stat, amount]) => [stat, amount]);
}

export const SAFARI_NATURE_IDS = Object.freeze(Object.keys(NATURE_STAT_CHANGES));
