const connected = (family, owner) => Object.freeze({ status: "connected", family, owner });
const blocked = (family, ownerNeeded) => Object.freeze({ status: "effect_mapped_owner_blocked", family, ownerNeeded });

const X_STAT_ITEMS = [
  "XATTACK", "XATTACK2", "XATTACK3", "XATTACK6",
  "XDEFENSE", "XDEFENSE2", "XDEFENSE3", "XDEFENSE6",
  "XSPATK", "XSPATK2", "XSPATK3", "XSPATK6",
  "XSPDEF", "XSPDEF2", "XSPDEF3", "XSPDEF6",
  "XSPEED", "XSPEED2", "XSPEED3", "XSPEED6",
  "XACCURACY", "XACCURACY2", "XACCURACY3", "XACCURACY6",
];

export const ITEM_EFFECT_SUPPORT_STATUS = Object.freeze({
  ...Object.fromEntries(X_STAT_ITEMS.map((id) => [id, connected("battle_stat_stage", "safari-normal-battle-lifecycle")])),
  POKEDOLL: connected("battle_certain_escape", "safari-flee-command"),
  FLUFFYTAIL: connected("battle_certain_escape", "safari-flee-command"),
  POKETOY: connected("battle_certain_escape", "safari-flee-command"),

  DIREHIT: blocked("focus_energy", "shared Battle battler Focus Energy state owner"),
  DIREHIT2: blocked("focus_energy", "shared Battle battler Focus Energy state owner"),
  DIREHIT3: blocked("focus_energy", "shared Battle battler Focus Energy state owner"),
  GUARDSPEC: blocked("side_mist", "shared Battle side Mist-turn state owner"),

  REPEL: blocked("repel_steps", "shared field movement/encounter/persistence owner"),
  SUPERREPEL: blocked("repel_steps", "shared field movement/encounter/persistence owner"),
  MAXREPEL: blocked("repel_steps", "shared field movement/encounter/persistence owner"),
});

export function getItemEffectSupportStatus(itemId) {
  const id = String(itemId ?? "").toUpperCase();
  const entry = ITEM_EFFECT_SUPPORT_STATUS[id];
  return entry ? { itemId: id, known: true, ...entry } : { itemId: id, known: false, status: "unreviewed" };
}
