import { materializePokemonMoveRuntime, pokemonMoveTotalPp } from "./pokemon-runtime.js";

export const PARTY_REVIVAL_ITEM_EFFECT_SOURCE = Object.freeze({
  canonical: "Mapless v0.9.108 / Essentials v21.1 SACREDASH UseInField",
  mechanicsGeneration: 9,
});

export const PARTY_REVIVAL_ITEM_EFFECTS = Object.freeze({
  SACREDASH: Object.freeze({ kind: "fainted_party_full_heal", field: true, battle: false, consumable: true }),
});

function moveId(move) {
  return typeof move === "string" ? move : move?.id;
}

function fullyRestoreMoves(pokemon, moveMasters) {
  if (!Array.isArray(pokemon?.moves)) return [];
  return pokemon.moves.map((rawMove) => {
    const id = moveId(rawMove);
    if (!id) return typeof rawMove === "string" ? rawMove : { ...rawMove };
    const baseTotalPp = Number(moveMasters?.[id]?.total_pp);
    if (!Number.isInteger(baseTotalPp) || baseTotalPp < 0) return typeof rawMove === "string" ? rawMove : { ...rawMove };
    const move = materializePokemonMoveRuntime(rawMove, baseTotalPp);
    const totalPp = pokemonMoveTotalPp(baseTotalPp, Number(move.ppup ?? 0));
    return { ...move, pp: totalPp };
  });
}

export function isPartyRevivalItem(itemId) {
  return Object.prototype.hasOwnProperty.call(PARTY_REVIVAL_ITEM_EFFECTS, String(itemId ?? "").toUpperCase());
}

export function isPartyRevivalItemUsableInContext(itemId, context = "field") {
  const effect = PARTY_REVIVAL_ITEM_EFFECTS[String(itemId ?? "").toUpperCase()];
  if (!effect) return false;
  if (context === "field") return effect.field === true;
  if (context === "battle") return effect.battle === true;
  return false;
}

export function partyRevivalItemCanAffectParty({ itemId, party, context = "field" } = {}) {
  const id = String(itemId ?? "").toUpperCase();
  if (!isPartyRevivalItemUsableInContext(id, context) || !Array.isArray(party)) return false;
  return party.some((pokemon) => pokemon && Number(pokemon.steps_to_hatch ?? 0) <= 0 && Number(pokemon.hp ?? 0) <= 0);
}

export function resolvePartyRevivalItemEffect({ itemId, party, moveMasters, context = "field" } = {}) {
  const id = String(itemId ?? "").toUpperCase();
  const effect = PARTY_REVIVAL_ITEM_EFFECTS[id];
  if (!effect) return { used: false, result: "unsupported_item", itemId: id };
  if (!isPartyRevivalItemUsableInContext(id, context)) return { used: false, result: "unsupported_context", itemId: id };
  if (!Array.isArray(party) || party.length === 0) return { used: false, result: "no_pokemon", itemId: id };

  const targets = [];
  for (let index = 0; index < party.length; index += 1) {
    const pokemon = party[index];
    if (!pokemon || Number(pokemon.steps_to_hatch ?? 0) > 0 || Number(pokemon.hp ?? 0) > 0) continue;
    const maxHp = Math.max(1, Math.trunc(Number(pokemon.max_hp ?? 1)));
    targets.push(Object.freeze({
      partyIndex: index,
      hpBefore: Math.max(0, Math.trunc(Number(pokemon.hp ?? 0))),
      hpAfter: maxHp,
      statusBefore: pokemon.status ?? null,
      statusAfter: null,
      moves: fullyRestoreMoves(pokemon, moveMasters),
    }));
  }

  if (targets.length === 0) return { used: false, result: "no_effect", itemId: id };
  return {
    used: true,
    result: "used",
    itemId: id,
    effect: effect.kind,
    consumable: effect.consumable,
    targets: Object.freeze(targets),
  };
}
