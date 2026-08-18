import { SAFARI_MOVE_MASTERS } from "./safari-playable-data.js";
import { pokemonMoveTotalPp, setPokemonRuntimeMovePp, updatePokemonRuntime } from "./pokemon-runtime.js";

function moveId(move) { return typeof move === "string" ? move : move?.id; }
function maxHpOf(pokemon) { return Math.max(1, Math.trunc(Number(pokemon?.max_hp ?? pokemon?.hp ?? 1))); }
function isUsable(pokemon) { return Boolean(pokemon) && Number(pokemon.hp ?? 0) > 0; }

export function healSafariPokemonFull(pokemon) {
  if (!pokemon) return pokemon;
  let healed = updatePokemonRuntime(pokemon, { hp: maxHpOf(pokemon), status: "NONE", status_count: 0 });
  for (let index = 0; index < healed.moves.length; index += 1) {
    const move = healed.moves[index];
    const master = SAFARI_MOVE_MASTERS[moveId(move)];
    if (!master || !Number.isInteger(master.total_pp)) continue;
    const ppup = typeof move === "string" ? 0 : Number(move.ppup ?? 0);
    const totalPp = pokemonMoveTotalPp(master.total_pp, Number.isInteger(ppup) && ppup >= 0 ? ppup : 0);
    healed = setPokemonRuntimeMovePp(healed, index, totalPp, master.total_pp);
  }
  return healed;
}

export function healSafariPartyFull(runtime) {
  runtime.player ??= { party: [] };
  runtime.player.party = (runtime.player.party ?? []).map((pokemon) => pokemon ? healSafariPokemonFull(pokemon) : pokemon);
  return runtime.player.party;
}

export function healSafariPartyPercent(runtime, percent, { cureStatus = false } = {}) {
  const pct = Math.max(0, Math.trunc(Number(percent) || 0));
  runtime.player ??= { party: [] };
  runtime.player.party = (runtime.player.party ?? []).map((pokemon) => {
    if (!isUsable(pokemon)) return pokemon;
    const maxHp = maxHpOf(pokemon);
    const amount = Math.max(1, Math.ceil((maxHp * pct) / 100));
    const changes = { hp: Math.min(maxHp, Math.trunc(Number(pokemon.hp ?? 0)) + amount) };
    if (cureStatus) { changes.status = "NONE"; changes.status_count = 0; }
    return updatePokemonRuntime(pokemon, changes);
  });
  return runtime.player.party;
}

export function damageSafariPokemonPercent(pokemon, percent) {
  if (!isUsable(pokemon)) return pokemon;
  const pct = Math.max(0, Math.trunc(Number(percent) || 0));
  const maxHp = maxHpOf(pokemon);
  const damage = Math.max(1, Math.ceil((maxHp * pct) / 100));
  return updatePokemonRuntime(pokemon, { hp: Math.max(Math.trunc(Number(pokemon.hp ?? 0)) - damage, 1) });
}

export function inflictSafariOverworldStatus(pokemon, status) {
  if (!isUsable(pokemon)) return pokemon;
  const id = String(status ?? "NONE").toUpperCase();
  if (id === "CONFUSION") return updatePokemonRuntime(pokemon, { mapless_overworld_confusion: true });
  if (String(pokemon.status ?? "NONE").toUpperCase() !== "NONE") return pokemon;
  return updatePokemonRuntime(pokemon, { status: id, status_count: 0 });
}
