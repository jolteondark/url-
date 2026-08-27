function requireFunction(value, name) {
  if (typeof value !== "function") throw new TypeError(`${name} is required`);
  return value;
}

function requireFiniteNumber(value, name) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${name} must be finite`);
  return number;
}

/**
 * Frozen v0.9.108 MaplessNormalEvents.heal_party_percent contract.
 *
 * This owner intentionally does not know the Safari/UI Pokemon shape and does
 * not mutate HP directly. The caller supplies the existing Pokemon/Party
 * accessors and mutation boundary; this module only owns the canonical
 * normal-event iteration and HP arithmetic.
 */
export function resolveMaplessV108PartyPercentHeal(party, fraction, {
  getHp,
  getTotalHp,
  isFainted,
  setHp,
} = {}) {
  if (!Array.isArray(party)) throw new TypeError("party must be an array");
  const readHp = requireFunction(getHp, "getHp");
  const readTotalHp = requireFunction(getTotalHp, "getTotalHp");
  const fainted = requireFunction(isFainted, "isFainted");
  const writeHp = requireFunction(setHp, "setHp");
  const frac = requireFiniteNumber(fraction, "fraction");

  let healed = 0;
  const operations = [];
  for (let index = 0; index < party.length; index += 1) {
    const pokemon = party[index];
    if (fainted(pokemon, index)) continue;

    const hp = requireFiniteNumber(readHp(pokemon, index), "hp");
    const totalHp = requireFiniteNumber(readTotalHp(pokemon, index), "totalHp");
    if (totalHp < 0) throw new RangeError("totalHp must not be negative");

    const amount = Math.max(1, Math.ceil(totalHp * frac));
    const nextHp = Math.min(totalHp, hp + amount);
    if (nextHp <= hp) continue;

    writeHp(pokemon, nextHp, index);
    healed += 1;
    operations.push(Object.freeze({ index, hpBefore:hp, hpAfter:nextHp, amount:nextHp - hp }));
  }

  return Object.freeze({ healed, operations:Object.freeze(operations) });
}
