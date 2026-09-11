function requireRandomInt(randomInt) {
  if (typeof randomInt !== "function") throw new TypeError("randomInt is required to create Player identity");
  return randomInt;
}

function draw16(randomInt, label) {
  const value = Number(randomInt(0x10000, label));
  if (!Number.isInteger(value) || value < 0 || value >= 0x10000) {
    throw new RangeError(`randomInt(65536) returned invalid ${label}: ${value}`);
  }
  return value;
}

export function ensureMaplessPlayerIdentityV108(player, randomInt) {
  if (!player || typeof player !== "object" || Array.isArray(player)) throw new TypeError("player is required");
  if (Number.isInteger(player.id) && player.id >= 0 && player.id <= 0xffffffff) return player.id >>> 0;
  const draw = requireRandomInt(randomInt);
  const low = draw16(draw, "player_id.low16");
  const high = draw16(draw, "player_id.high16");
  player.id = (low | (high << 16)) >>> 0;
  return player.id;
}

export function maplessPlayerPublicIdV108(player) {
  if (!player || !Number.isInteger(player.id)) throw new TypeError("persisted player.id is required");
  return Number(player.id) & 0xffff;
}

export function maplessPlayerSecretIdV108(player) {
  if (!player || !Number.isInteger(player.id)) throw new TypeError("persisted player.id is required");
  return (Number(player.id) >>> 16) & 0xffff;
}
