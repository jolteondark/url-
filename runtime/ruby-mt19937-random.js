export class RubyMT19937Random {
  constructor(seed = 0) {
    this.state = new Uint32Array(624);
    this.index = 624;
    this.state[0] = Number(seed) >>> 0;
    for (let i = 1; i < 624; i += 1) {
      const previous = this.state[i - 1];
      this.state[i] = (Math.imul(1812433253, previous ^ (previous >>> 30)) + i) >>> 0;
    }
  }

  twist() {
    for (let i = 0; i < 624; i += 1) {
      const y = (this.state[i] & 0x80000000) | (this.state[(i + 1) % 624] & 0x7fffffff);
      let next = this.state[(i + 397) % 624] ^ (y >>> 1);
      if (y & 1) next ^= 0x9908b0df;
      this.state[i] = next >>> 0;
    }
    this.index = 0;
  }

  uint32() {
    if (this.index >= 624) this.twist();
    let y = this.state[this.index++];
    y ^= y >>> 11;
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= y >>> 18;
    return y >>> 0;
  }

  randInt(limit) {
    const max = Number(limit);
    if (!Number.isSafeInteger(max) || max <= 0 || max > 0x100000000) throw new RangeError("Ruby randInt limit must be 1..2^32");
    if (max === 0x100000000) return this.uint32();
    let mask = max - 1;
    mask |= mask >>> 1;
    mask |= mask >>> 2;
    mask |= mask >>> 4;
    mask |= mask >>> 8;
    mask |= mask >>> 16;
    mask >>>= 0;
    while (true) {
      const value = this.uint32() & mask;
      if (value < max) return value;
    }
  }
}

export function createRubyRandomPicker(seed) {
  const rng = new RubyMT19937Random(Number(seed) & 0x7fffffff);
  return (length) => rng.randInt(length);
}
