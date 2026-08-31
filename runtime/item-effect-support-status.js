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

const HP_HEALING_ITEMS = [
  "POTION", "SWEETHEART", "SUPERPOTION", "HYPERPOTION", "MAXPOTION",
  "FRESHWATER", "SODAPOP", "LEMONADE", "MOOMOOMILK",
  "ENERGYPOWDER", "ENERGYROOT", "CANARIBREAD",
];
const HP_HEALING_HELD_ITEMS = ["BERRYJUICE", "ORANBERRY", "SITRUSBERRY"];
const HELD_HP_OWNER = "safari-bag-item-use + battle-ability-item-hook-dispatch/battle-runtime-integration/battle-held-item-runtime-integration";

const STATUS_HEALING_ITEMS = [
  "AWAKENING", "BLUEFLUTE", "POKEFLUTE", "ANTIDOTE", "BURNHEAL",
  "PARALYZEHEAL", "PARLYZHEAL", "ICEHEAL", "FULLHEAL", "LAVACOOKIE",
  "OLDGATEAU", "CASTELIACONE", "LUMIOSEGALETTE", "SHALOURSABLE",
  "BIGMALASADA", "PEWTERCRUNCHIES", "RAGECANDYBAR", "HEALPOWDER", "YELLOWFLUTE",
];
const STATUS_HEALING_HELD_CONNECTED = [
  "CHESTOBERRY", "PECHABERRY", "RAWSTBERRY", "CHERIBERRY", "ASPEARBERRY",
];
const STATUS_HEALING_HELD_CONFUSION_BLOCKED = ["LUMBERRY", "PERSIMBERRY"];
const STATUS_BERRY_OWNER = "safari-bag-item-use + battle-ability-item-hook-dispatch/battle-status-pp-flow/battle-held-item-consumption-flow";
const HELD_CONFUSION_OWNER_NEEDED = "shared Battle confusion-state owner + held confusion-cure trigger; Bag target-use remains connected via safari-bag-item-use";

const PP_RESTORE_ITEMS = ["ETHER", "MAXETHER", "ELIXIR", "MAXELIXIR"];
const PP_RESTORE_HELD_ITEMS = ["LEPPABERRY", "HOPOBERRY"];
const PP_CAPACITY_ITEMS = ["PPUP", "PPMAX"];
const REVIVAL_ITEMS = ["REVIVE", "MAXREVIVE", "MAXHONEY", "REVIVALHERB"];
const EXP_CANDY_ITEMS = ["EXPCANDYXS", "EXPCANDYS", "EXPCANDYM", "EXPCANDYL", "EXPCANDYXL"];
const EVOLUTION_STONE_ITEMS = [
  "FIRESTONE", "THUNDERSTONE", "WATERSTONE", "LEAFSTONE", "MOONSTONE",
  "SUNSTONE", "DUSKSTONE", "DAWNSTONE", "SHINYSTONE", "ICESTONE",
  "SWEETAPPLE", "TARTAPPLE", "CRACKEDPOT", "CHIPPEDPOT",
  "GALARICACUFF", "GALARICAWREATH", "BLACKAUGURITE", "PEATBLOCK",
  "LINKINGCORD", "AUSPICIOUSARMOR", "MALICIOUSARMOR",
  "SCROLLOFDARKNESS", "SCROLLOFWATERS", "SYRUPYAPPLE",
  "UNREMARKABLETEACUP", "MASTERPIECETEACUP", "METALALLOY",
];
const FORM_CHANGE_KEY_ITEMS = ["GRACIDEA", "REVEALGLASS", "METEORITE", "ROTOMCATALOG", "PRISONBOTTLE"];
const FUSION_KEY_ITEMS = [
  "DNASPLICERS", "DNASPLICERSUSED",
  "NSOLARIZER", "NSOLARIZERUSED",
  "NLUNARIZER", "NLUNARIZERUSED",
  "REINSOFUNITY", "REINSOFUNITYUSED",
];
const HELD_PP_OWNER = "safari-bag-item-use + safari-normal-battle-round-pre-gems/item-held-pp-restore-berry-effects";
const CERTAIN_ESCAPE_OWNER_NEEDED = "battle Bag no-target dispatch into safari-flee-command attemptSafariFlee(certainEscapeByItem=true) + consume only after successful escape";
const ABILITY_MUTATION_OWNER_NEEDED = "shared Pokemon ability-index/species-ability owner + Bag target confirmation/consume-on-success adapter";
const ITEM_EVOLUTION_OWNER_NEEDED = "shared Pokemon species/form item-evolution resolver + canonical evolution sequence + Bag consume-on-success adapter";
const LEVEL_UP_ITEM_OWNER_NEEDED = "shared Pokemon level/experience owner + canonical level-up/move-learning/evolution sequence + Bag consume-on-success adapter";
const EXP_CANDY_OWNER_NEEDED = "shared Pokemon experience/growth-rate owner + canonical experience gain/level-up/move-learning/evolution sequence + Bag quantity consume-on-success adapter";
const FORM_CHANGE_OWNER_NEEDED = "shared Pokemon species/form setForm owner + Bag OnPokemon target adapter; key item must remain non-consumable";
const FUSION_OWNER_NEEDED = "shared Pokemon fused-state + species/form setForm owner + Party remove/restore owner + atomic Bag key-item replace adapter";
const ZYGARDE_CUBE_OWNER_NEEDED = "shared Pokemon species/form setForm + ability-index owner + Bag OnPokemon choice adapter; key item must remain non-consumable";
const PARTY_MASS_REVIVAL_OWNER_NEEDED = "shared Party roster mutation owner + field Bag direct-use adapter that heals every fainted party Pokemon and consumes exactly once only when at least one Pokemon is revived";

export const ITEM_EFFECT_SUPPORT_STATUS = Object.freeze({
  ...Object.fromEntries(X_STAT_ITEMS.map((id) => [id, connected("battle_stat_stage", "safari-normal-battle-lifecycle")])),
  ...Object.fromEntries(HP_HEALING_ITEMS.map((id) => [id, connected("medicine_hp_healing", "safari-bag-item-use")])),
  ...Object.fromEntries(HP_HEALING_HELD_ITEMS.map((id) => [id, connected("medicine_hp_healing", HELD_HP_OWNER)])),
  ...Object.fromEntries(STATUS_HEALING_ITEMS.map((id) => [id, connected("medicine_status_healing", "safari-bag-item-use")])),
  ...Object.fromEntries(STATUS_HEALING_HELD_CONNECTED.map((id) => [id, connected("medicine_status_healing", STATUS_BERRY_OWNER)])),
  ...Object.fromEntries(STATUS_HEALING_HELD_CONFUSION_BLOCKED.map((id) => [id, blocked("medicine_status_healing", HELD_CONFUSION_OWNER_NEEDED)])),
  ...Object.fromEntries(PP_RESTORE_ITEMS.map((id) => [id, connected("medicine_pp_restore", "safari-bag-item-use")])),
  ...Object.fromEntries(PP_RESTORE_HELD_ITEMS.map((id) => [id, connected("medicine_pp_restore", HELD_PP_OWNER)])),
  ...Object.fromEntries(PP_CAPACITY_ITEMS.map((id) => [id, connected("medicine_pp_capacity", "safari-bag-item-use")])),
  ...Object.fromEntries(REVIVAL_ITEMS.map((id) => [id, connected("medicine_revival", "safari-bag-item-use")])),
  ...Object.fromEntries(EXP_CANDY_ITEMS.map((id) => [id, blocked("experience_candy", EXP_CANDY_OWNER_NEEDED)])),
  ...Object.fromEntries(EVOLUTION_STONE_ITEMS.map((id) => [id, blocked("item_evolution", ITEM_EVOLUTION_OWNER_NEEDED)])),
  ...Object.fromEntries(FORM_CHANGE_KEY_ITEMS.map((id) => [id, blocked("pokemon_form_change", FORM_CHANGE_OWNER_NEEDED)])),
  ...Object.fromEntries(FUSION_KEY_ITEMS.map((id) => [id, blocked("pokemon_fusion_key_item", FUSION_OWNER_NEEDED)])),
  FULLRESTORE: connected("medicine_full_restore", "safari-bag-item-use"),
  SACREDASH: blocked("party_mass_revival", PARTY_MASS_REVIVAL_OWNER_NEEDED),
  RARECANDY: blocked("level_up_item", LEVEL_UP_ITEM_OWNER_NEEDED),
  ZYGARDECUBE: blocked("zygarde_cube", ZYGARDE_CUBE_OWNER_NEEDED),

  ABILITYCAPSULE: blocked("ability_mutation", ABILITY_MUTATION_OWNER_NEEDED),
  ABILITYPATCH: blocked("ability_mutation", ABILITY_MUTATION_OWNER_NEEDED),

  POKEDOLL: blocked("battle_certain_escape", CERTAIN_ESCAPE_OWNER_NEEDED),
  FLUFFYTAIL: blocked("battle_certain_escape", CERTAIN_ESCAPE_OWNER_NEEDED),
  POKETOY: blocked("battle_certain_escape", CERTAIN_ESCAPE_OWNER_NEEDED),

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
