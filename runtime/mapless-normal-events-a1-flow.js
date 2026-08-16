function cloneEvent(source = {}) {
  return { ...source, normal_data: { ...(source.normal_data ?? {}) } };
}

function baseResult(event, operations, result, outcome) {
  return { event, operations, result, outcome };
}

function finish(event, operations, outcome) {
  event.normal_resolved = true;
  operations.push({ op: 'finish_event' });
  return baseResult(event, operations, true, outcome);
}

function unresolved(event, operations, outcome) {
  return baseResult(event, operations, false, outcome);
}

function chosen(input, type = null) {
  const pokemon = input.chosen_pokemon ?? null;
  return pokemon ? { op: 'choose_pokemon', type, result: pokemon } : { op: 'choose_pokemon', type, result: null };
}

function requireRewardItems(items, min, max, label) {
  if (!Array.isArray(items) || items.length < min || items.length > max) {
    throw new Error(`${label} requires ${min}-${max} resolved reward item(s)`);
  }
  return [...items];
}

export function resolveFloodedRiver(input = {}) {
  const event = cloneEvent(input.event);
  const operations = [];
  const actions = [];
  if (input.has_water) actions.push('water');
  if (input.has_ice) actions.push('ice');
  actions.push('force', 'leave');
  operations.push({ op: 'present_choices', event_id: 'flooded_river', actions });
  const action = input.action;
  if (!actions.includes(action)) return unresolved(event, operations, 'cancelled');
  if (action === 'leave') {
    operations.push({ op: 'leave_event' });
    return finish(event, operations, 'left');
  }
  if (action === 'water') {
    operations.push(chosen(input, 'WATER'));
    operations.push({ op: 'grant_items', items: requireRewardItems(input.reward_items, 1, 2, 'flooded_river water') });
    return finish(event, operations, 'water_crossing');
  }
  if (action === 'ice') {
    operations.push(chosen(input, 'ICE'));
    operations.push({ op: 'grant_items', items: requireRewardItems(input.reward_items, 1, 1, 'flooded_river ice') });
    return finish(event, operations, 'ice_crossing');
  }
  const roll = Number(event.normal_data.force_roll ?? input.force_roll);
  if (!Number.isFinite(roll)) throw new Error('flooded_river force_roll unresolved');
  operations.push({ op: 'force_roll', value: roll });
  if (roll < 65) operations.push({ op: 'damage_party', amount: 10 });
  else {
    operations.push({ op: 'damage_party', amount: 20 });
    if (roll >= 90 && input.lost_item) operations.push({ op: 'remove_item', item: input.lost_item, quantity: 1 });
  }
  return finish(event, operations, roll < 65 ? 'force_minor_damage' : roll < 90 ? 'force_major_damage' : 'force_major_damage_item_lost');
}

export function resolveBurningWagon(input = {}) {
  const event = cloneEvent(input.event);
  const operations = [];
  const actions = [];
  if (input.has_water) actions.push('water');
  if (input.has_fire) actions.push('fire');
  actions.push('manual', 'leave');
  operations.push({ op: 'present_choices', event_id: 'burning_wagon', actions });
  const action = input.action;
  if (!actions.includes(action)) return unresolved(event, operations, 'cancelled');
  if (action === 'leave') { operations.push({ op: 'leave_event' }); return finish(event, operations, 'left'); }
  if (action === 'water') {
    operations.push(chosen(input, 'WATER'));
    operations.push({ op: 'grant_items', items: requireRewardItems(input.reward_items, 2, 3, 'burning_wagon water') });
    return finish(event, operations, 'water_rescue');
  }
  if (action === 'fire') {
    operations.push(chosen(input, 'FIRE'));
    const choices = Array.isArray(event.normal_data.fire_choices) ? event.normal_data.fire_choices : [];
    if (input.fire_choice != null) {
      if (!choices.includes(input.fire_choice)) throw new Error('burning_wagon fire_choice is not canonical prepared choice');
      operations.push({ op: 'grant_items', items: [input.fire_choice] });
    }
    return finish(event, operations, input.fire_choice == null ? 'fire_rescue_no_reward' : 'fire_rescue_reward');
  }
  const roll = Number(event.normal_data.manual_roll);
  if (!Number.isFinite(roll)) throw new Error('burning_wagon manual_roll unresolved');
  operations.push({ op: 'manual_roll', value: roll });
  if (roll < 60) operations.push({ op: 'damage_pokemon', target: 'active_party_0', amount: 20 });
  else if (roll < 85) operations.push({ op: 'grant_random', tier: 'small', quantity: 1 });
  else operations.push({ op: 'damage_pokemon', target: 'active_party_0', amount: 20 }, { op: 'inflict_status', target: 'active_party_0', status: 'BURN' });
  return finish(event, operations, roll < 60 ? 'manual_rescue_injured' : roll < 85 ? 'manual_rescue_reward' : 'manual_failure_burn');
}

export function resolveMushroomField(input = {}) {
  const event = cloneEvent(input.event);
  const operations = [];
  const actions = ['eat'];
  if (input.has_poison) actions.push('poison');
  actions.push('sell', 'leave');
  operations.push({ op: 'present_choices', event_id: 'mushroom_field', actions });
  const action = input.action;
  if (!actions.includes(action)) return unresolved(event, operations, 'cancelled');
  if (action === 'leave') { operations.push({ op: 'leave_event' }); return finish(event, operations, 'left'); }
  if (action === 'sell') {
    const amount = 400 + Number(input.scaling_value ?? 0) * 120;
    operations.push({ op: 'add_money', amount });
    return finish(event, operations, 'sold');
  }
  if (action === 'poison') {
    const appraiser = input.appraiser_pokemon ?? null;
    operations.push({ op: 'choose_pokemon', type: 'POISON', result: appraiser });
    if (!appraiser) return unresolved(event, operations, 'appraiser_cancelled');
    const target = input.target_pokemon ?? null;
    operations.push({ op: 'choose_pokemon', type: null, result: target });
    if (!target) return unresolved(event, operations, 'target_cancelled');
    operations.push({ op: 'add_bonus', target, stat: event.normal_data.eat_stat, amount: 1 });
    return finish(event, operations, 'poison_appraised_bonus');
  }
  const target = input.target_pokemon ?? null;
  operations.push({ op: 'choose_pokemon', type: null, result: target });
  if (!target) return unresolved(event, operations, 'target_cancelled');
  const roll = Number(event.normal_data.eat_roll);
  if (!Number.isFinite(roll)) throw new Error('mushroom_field eat_roll unresolved');
  operations.push({ op: 'eat_roll', value: roll });
  if (roll < 55) operations.push({ op: 'add_bonus', target, stat: event.normal_data.eat_stat, amount: 1 });
  else if (roll < 75) operations.push({ op: 'heal_pokemon_full', target });
  else if (roll < 90) operations.push({ op: 'inflict_status', target, status: event.normal_data.bad_status });
  else operations.push({ op: 'damage_pokemon', target, amount: 25 });
  return finish(event, operations, roll < 55 ? 'eat_bonus' : roll < 75 ? 'eat_heal' : roll < 90 ? 'eat_status' : 'eat_damage');
}

export function resolveHotSpring(input = {}) {
  const event = cloneEvent(input.event);
  const operations = [];
  const actions = [];
  if (input.has_water || input.has_ice) actions.push('safe');
  actions.push('enter', 'bottle', 'leave');
  operations.push({ op: 'present_choices', event_id: 'hot_spring', actions });
  const action = input.action;
  if (!actions.includes(action)) return unresolved(event, operations, 'cancelled');
  if (action === 'leave') { operations.push({ op: 'leave_event' }); return finish(event, operations, 'left'); }
  if (action === 'safe') {
    operations.push({ op: 'full_heal_party' });
    return finish(event, operations, 'safe_full_heal');
  }
  if (action === 'bottle') {
    operations.push({ op: 'grant_items', items: requireRewardItems(input.reward_items, 1, 2, 'hot_spring bottle') });
    return finish(event, operations, 'bottled_water');
  }
  const roll = Number(event.normal_data.enter_roll ?? input.enter_roll);
  if (!Number.isFinite(roll)) throw new Error('hot_spring enter_roll unresolved');
  operations.push({ op: 'enter_roll', value: roll });
  if (roll < 60) operations.push({ op: 'heal_party_percent', amount: 50, revive: false });
  else if (roll < 85) operations.push({ op: 'full_heal_party' });
  else operations.push({ op: 'damage_pokemon', target: 'active_party_0', amount: 15 }, { op: 'inflict_status', target: 'active_party_0', status: 'BURN' });
  return finish(event, operations, roll < 60 ? 'enter_half_heal' : roll < 85 ? 'enter_full_heal' : 'enter_burn');
}
