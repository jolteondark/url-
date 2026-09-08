export function browserBattleRandomSeed() {
  if (globalThis.crypto?.getRandomValues) {
    const seed = new Uint32Array(1);
    globalThis.crypto.getRandomValues(seed);
    return seed[0] & 0x7fffffff;
  }
  return Math.floor(Math.random() * 0x80000000);
}
