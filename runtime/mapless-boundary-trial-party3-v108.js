// Exact party-size-3 formations from source-v0.9.108.
// Source: Plugins/ZZZZZZZZZZZZZZZZZZZ Mapless Boundary Trials/001_Mapless_Boundary_Trial_Data.rb
const party = (trainerType, name, gender, members) => Object.freeze({
  trainer_type: trainerType,
  trainer_name: name,
  trainer_full_name: `ジムリーダーの${name}`,
  gender,
  members: Object.freeze(members.map((member) => Object.freeze({ ...member, moves: Object.freeze([...member.moves]) }))),
});
const mon = (species, ability, item, moves, ace = false) => ({ species, ability, item, moves, ace });

export const MAPLESS_BOUNDARY_PARTY3_V108 = Object.freeze({
  BROCK: party("LEADER_Brock", "タケシ", 0, [
    mon("GEODUDE", "STURDY", null, ["ROCKTOMB","BULLDOZE","DEFENSECURL","STEALTHROCK"]),
    mon("RHYHORN", "ROCKHEAD", "HARDSTONE", ["ROCKTOMB","BULLDOZE","SCARYFACE","ROAR"]),
    mon("ONIX", "STURDY", "ORANBERRY", ["ROCKTOMB","BULLDOZE","BIND","SCREECH"], true),
  ]),
  MISTY: party("LEADER_Misty", "カスミ", 1, [
    mon("POLIWAG", "WATERABSORB", null, ["WATERPULSE","ICYWIND","MUDSHOT","RAINDANCE"]),
    mon("PSYDUCK", "CLOUDNINE", "ORANBERRY", ["WATERPULSE","CONFUSION","DISABLE","YAWN"]),
    mon("STARYU", "NATURALCURE", "MYSTICWATER", ["WATERPULSE","SWIFT","PSYBEAM","LIGHTSCREEN"], true),
  ]),
  SURGE: party("LEADER_Surge", "マチス", 0, [
    mon("VOLTORB", "SOUNDPROOF", null, ["SPARK","CHARGEBEAM","SCREECH","EERIEIMPULSE"]),
    mon("MAGNEMITE", "STURDY", "ORANBERRY", ["SHOCKWAVE","MIRRORSHOT","THUNDERWAVE","SUPERSONIC"]),
    mon("PIKACHU", "STATIC", "MAGNET", ["ELECTROBALL","QUICKATTACK","NUZZLE","CHARGE"], true),
  ]),
  ERIKA: party("LEADER_Erika", "エリカ", 1, [
    mon("WEEPINBELL", "CHLOROPHYLL", null, ["RAZORLEAF","ACID","SLEEPPOWDER","GROWTH"]),
    mon("TANGELA", "CHLOROPHYLL", "ORANBERRY", ["MEGADRAIN","ANCIENTPOWER","STUNSPORE","BIND"]),
    mon("GLOOM", "CHLOROPHYLL", "MIRACLESEED", ["MEGADRAIN","ACID","MOONLIGHT","SWEETSCENT"], true),
  ]),
  KOGA: party("LEADER_Koga", "キョウ", 0, [
    mon("KOFFING", "LEVITATE", null, ["SMOG","ASSURANCE","CLEARSMOG","SMOKESCREEN"]),
    mon("GOLBAT", "INNERFOCUS", "ORANBERRY", ["WINGATTACK","BITE","POISONFANG","CONFUSERAY"]),
    mon("WEEZING", "LEVITATE", "POISONBARB", ["SLUDGE","INCINERATE","WILLOWISP","VENOSHOCK"], true),
  ]),
  SABRINA: party("LEADER_Sabrina", "ナツメ", 1, [
    mon("DROWZEE", "INSOMNIA", null, ["PSYBEAM","HEADBUTT","DISABLE","THUNDERWAVE"]),
    mon("MRMIME", "FILTER", "ORANBERRY", ["PSYBEAM","MAGICALLEAF","REFLECT","LIGHTSCREEN"]),
    mon("KADABRA", "MAGICGUARD", "TWISTEDSPOON", ["PSYBEAM","SHOCKWAVE","ENCORE","REFLECT"], true),
  ]),
  BLAINE: party("LEADER_Blaine", "カツラ", 0, [
    mon("VULPIX", "FLASHFIRE", null, ["INCINERATE","HEX","WILLOWISP","CONFUSERAY"]),
    mon("PONYTA", "FLAMEBODY", "ORANBERRY", ["FLAMECHARGE","STOMP","DOUBLEKICK","AGILITY"]),
    mon("MAGMAR", "FLAMEBODY", "CHARCOAL", ["FIREPUNCH","LOWKICK","CONFUSERAY","SMOKESCREEN"], true),
  ]),
  GREEN: party("RIVAL2", "グリーン", 0, [
    mon("RHYHORN", "LIGHTNINGROD", "HARDSTONE", ["ROCKTOMB","BULLDOZE","ICEFANG","SCARYFACE"]),
    mon("EXEGGCUTE", "CHLOROPHYLL", "ORANBERRY", ["PSYBEAM","MEGADRAIN","SLEEPPOWDER","REFLECT"]),
    mon("PIDGEOTTO", "KEENEYE", "SHARPBEAK", ["AERIALACE","QUICKATTACK","UTURN","FEATHERDANCE"], true),
  ]),
});

export function boundaryParty3DefinitionV108(leaderId) {
  const id = String(leaderId ?? "").toUpperCase();
  const definition = MAPLESS_BOUNDARY_PARTY3_V108[id];
  if (!definition) throw new RangeError(`unknown boundary leader: ${leaderId}`);
  return definition;
}
