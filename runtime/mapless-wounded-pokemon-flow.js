export const WOUNDED_HEALING_ITEM_IDS = Object.freeze([
  'POTION','SUPERPOTION','HYPERPOTION','MAXPOTION','FULLRESTORE',
  'FRESHWATER','SODAPOP','LEMONADE','MOOMOOMILK',
  'ORANBERRY','SITRUSBERRY','FIGYBERRY','WIKIBERRY','MAGOBERRY',
  'AGUAVBERRY','IAPAPABERRY','ENIGMABERRY','BERRYJUICE','SWEETHEART',
  'RAGECANDYBAR','ENERGYPOWDER','ENERGYROOT','CANARIBREAD'
]);

function cloneEvent(source = {}) {
  return { ...source, normal_data: { ...(source.normal_data || {}) } };
}

function done(event, outcome, operations = [], joinedPokemon = null) {
  event.normal_resolved = true;
  return { event, result: true, outcome, operations, joinedPokemon };
}

export function resolveWoundedPokemon(input = {}) {
  const event = cloneEvent(input.event || {});
  const data = event.normal_data;
  const operations = [{ op: 'metric_increment', key: 'wounded_seen', amount: 1 }];
  const party = Array.isArray(input.party) ? [...input.party] : [];

  if (party.length >= 6) {
    operations.push({ op: 'leave_event', message: '手持ちがいっぱいで、連れていくことはできなかった。' });
    return done(event, 'party_full', operations);
  }
  if (!data.species || input.species_exists === false) {
    operations.push({ op: 'leave_event', message: '傷ついたポケモンの姿は、すでになかった。' });
    return done(event, 'species_missing', operations);
  }

  if (input.choice !== 'treat') {
    operations.push({ op: 'leave_event', message: '傷ついたポケモンを見捨て、その場を離れた。' });
    return done(event, 'abandoned', operations);
  }

  const entries = Array.isArray(input.healing_entries) ? input.healing_entries : [];
  const validEntries = entries.filter((entry) => entry && WOUNDED_HEALING_ITEM_IDS.includes(entry.item)
    && Number.isInteger(entry.quantity) && entry.quantity > 0 && entry.consumed_after_use !== false);
  if (validEntries.length === 0) {
    operations.push({ op: 'healing_item_required' });
    return { event, result: false, outcome: 'no_healing_item', operations, joinedPokemon: null };
  }

  const itemId = input.item_id == null ? null : String(input.item_id);
  const selected = validEntries.find((entry) => entry.item === itemId);
  if (!selected) {
    operations.push({ op: 'healing_item_selection_required' });
    return { event, result: false, outcome: 'item_not_selected', operations, joinedPokemon: null };
  }

  const pokemon = input.pokemon && typeof input.pokemon === 'object' ? structuredClone(input.pokemon) : null;
  if (!pokemon || pokemon.species !== data.species) {
    operations.push({ op: 'resolved_pokemon_required', species: data.species, level: data.level ?? null });
    return { event, result: false, outcome: 'pokemon_unresolved', operations, joinedPokemon: null };
  }
  if (Number(pokemon.hp) !== 1) {
    operations.push({ op: 'wounded_hp_must_start_at_one', actual: pokemon.hp });
    return { event, result: false, outcome: 'pokemon_unresolved', operations, joinedPokemon: null };
  }

  const heal = input.heal_result;
  if (!heal || heal.used !== true || !Number.isFinite(Number(heal.hp_after)) || Number(heal.hp_after) <= 1) {
    operations.push({ op: 'healing_failed', item: itemId });
    return { event, result: false, outcome: 'healing_failed', operations, joinedPokemon: null };
  }
  if (input.item_removed !== true) {
    operations.push({ op: 'item_remove_required', item: itemId, quantity: 1 });
    return { event, result: false, outcome: 'item_remove_failed', operations, joinedPokemon: null };
  }

  pokemon.hp = Number(heal.hp_after);
  pokemon.held_item = null;
  pokemon.item = null;
  operations.push(
    { op: 'consume_item', item: itemId, quantity: 1 },
    { op: 'party_add', species: pokemon.species, personal_id: pokemon.personal_id ?? null },
    { op: 'pokedex_seen_owned_register', species: pokemon.species },
    { op: 'record_first_moves', species: pokemon.species },
    { op: 'metric_increment', key: 'wounded_treated', amount: 1 },
    { op: 'metric_increment', key: 'wounded_joined', amount: 1 },
    { op: 'metric_nested_increment', key: 'wounded_items', subkey: itemId, amount: 1 },
    { op: 'record_party_size_for_day' },
    { op: 'finish_event' }
  );
  return done(event, 'joined', operations, pokemon);
}
