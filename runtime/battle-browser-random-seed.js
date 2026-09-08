export function browserBattleRandomSeed() {
  if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === "function") {
    const value = new Uint32Array(1);
    globalThis.crypto.getRandomValues(value);
    return value[0] & 0x7fffffff;
  }
  return Math.floor(Math.random() * 0x80000000) & 0x7fffffff;
}
