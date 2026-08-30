const connected = (family, owner) => Object.freeze({ status: "connected", family, owner });
const partial = (family, owner, remaining) => Object.freeze({ status: "partially_connected", family, owner, remaining });
const blocked = (family, ownerNeeded) => Object.freeze({ status: "effect_mapped_owner_blocked", family, ownerNeeded });

const X_STAT_ITEMS = [
  "XATTACK", "XATTACK2", "XATTACK3", "XATTACK6",
  "XDEFENSE", "XDEFENSE2", "XDEFENSE3", "XDEFENSE6",
  "XSPATK", "XSPATK2", "XSPATK3", "XSPATK6",
  "XSPDEF", "XSPDEF2", "XSPDEF3", "XSPDEF6",
  "XSPEED", "XSPEED2", "XSPEED3", "XSPEED6",
  "XACCURACY", "XACCURACY2", "XACCURACY3", "XACCURACY6",
];

const HP_HEALING_ITEMS = [
  "POTION", "SWEETHEART", "SUPERPOTION", "HYPERPOTION", "MAXPOTION",
  "FRESHWATER", "SODAPOP", "LEMONADE", "MOOMOOMILK",
  "ENERGYPOWDER", "ENERGYROOT", "CANARIBREAD",
];
const HP_HEALING_HELD_ITEMS = ["BERRYJUICE", "ORANBERRY", "SITRUSBERRY"];

const STATUS_HEALING_ITEMS = [
  "AWAKENING", "BLUEFLUTE", "POKEFLUTE", "ANTIDOTE", "BURNHEAL",
  "PARALYZEHEAL", "PARLYZHEAL", "ICEHEAL", "FULLHEAL", "LAVACOOKIE",
  "OLDGATEAU", "CASTELIACONE", "LUMIOSEGALETTE", "SHALOURSABLE",
  "BIGMALASADA", "PEWTERCRUNCHIES", "RAGECANDYBAR", "HEALPOWDER", "YELLOWFLUTE",
];
const STATUS_HEALING_HELD_CONNECTED = [
  "CHESTOBERRY", "PECHABERRY", "RAWSTBERRY", "CHERIBERRY", "ASPEARBERRY",
];
const STATUS_HEALING_HELD_CONFUSION_PARTIAL = ["LUMBERRY", "PERSIMBERRY"];
const STATUS_BERRY_OWNER = "safari-bag-item-use + battle-ability-item-hook-dispatch/battle-status-pp-flow/battle-held-item-consumption-flow";

const PP_RESTORE_ITEMS = ["ETHER", "MAXETHER", "ELIXIR", "MAXELIXIR"];
const PP_RESTORE_HELD_ITEMS = ["LEPPABERRY", "HOPOBERRY"];
const PP_CAPACITY_ITEMS = ["PPUP", "PPMAX"];
const REVIVAL_ITEMS = ["REVIVE", "MAXREVIVE", "REVIVALHERB"];
const HELD_HP_REMAINING = "Bag target-use owner is connected; canonical automatic held HP threshold/recovery trigger still needs a shared Battle owner before held consumption can be connected";
const HELD_PP_REMAINING = "Bag target-use owner is connected; held PP trigger/eligibility/consumption owner audit remains";
const CONFUSION_BERRY_REMAINING = "held confusion cure boundary owner audit; major-status held trigger is connected where applicable";

export const ITEM_EFFECT_SUPPORT_STATUS = Object.freeze({
  ...Object.fromEntries(X_STAT_ITEMS.map((id) => [id, connected("battle_stat_stage", "safari-normal-battle-lifecycle")])),
  ...Object.fromEntries(HP_HEALING_ITEMS.map((id) => [id, connected("medicine_hp_healing", "safari-bag-item-use")])),
  ...Object.fromEntries(HP_HEALING_HELD_ITEMS.map((id) => [id, partial("medicine_hp_healing", "safari-bag-item-use", HELD_HP_REMAINING)])),
  ...Object.fromEntries(STATUS_HEALING_ITEMS.map((id) => [id, connected("medicine_status_healing", "safari-bag-item-use")])),
  ...Object.fromEntries(STATUS_HEALING_HELD_CONNECTED.map((id) => [id, connected("medicine_status_healing", STATUS_BERRY_OWNER)])),
  ...Object.fromEntries(STATUS_HEALING_HELD_CONFUSION_PARTIAL.map((id) => [id, partial("medicine_status_healing", STATUS_BERRY_OWNER, CONFUSION_BERRY_REMAINING)])),
  ...Object.fromEntries(PP_RESTORE_ITEMS.map((id) => [id, connected("medicine_pp_restore", "safari-bag-item-use")])),
  ...Object.fromEntries(PP_RESTORE_HELD_ITEMS.map((id) => [id, partial("medicine_pp_restore", "safari-bag-item-use", HELD_PP_REMAINING)])),
  ...Object.fromEntries(PP_CAPACITY_ITEMS.map((id) => [id, connected("medicine_pp_capacity", "safari-bag-item-use")])),
  ...Object.fromEntries(REVIVAL_ITEMS.map((id) => [id, connected("medicine_revival", "safari-bag-item-use")])),
  FULLRESTORE: connected("medicine_full_restore", "safari-bag-item-use"),

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
