import { setMoney } from './bag-economy-mart-flow.js';

export function resolveVillageBountyDepart(input = {}) {
  const state = { ...(input.village || {}) };
  const quest = state.active_bounty || null;
  const operations = [];
  if (!quest) return { state, operations, result: false, battle: null, reward_requested: false };
  if (Number(input.able_pokemon_count ?? 0) <= 0) {
    operations.push({ op: 'message', key: 'no_able_pokemon' });
    return { state, operations, result: false, battle: null, reward_requested: false };
  }
  if (Number(state.actions_left ?? 0) <= 0) {
    operations.push({ op: 'message', key: 'no_actions' });
    return { state, operations, result: false, battle: null, reward_requested: false };
  }
  operations.push({ op: 'confirm_bounty_depart', species: quest.species, form: Number(quest.form ?? 0) });
  if (input.confirmed !== true) return { state, operations, result: false, battle: null, reward_requested: false };
  if (input.consume_action_success === false) {
    operations.push({ op: 'consume_village_action', success: false });
    return { state, operations, result: false, battle: null, reward_requested: false };
  }
  state.actions_left = Math.max(0, Number(state.actions_left ?? 0) - 1);
  operations.push({ op: 'consume_village_action', success: true }, { op: 'battle_alert' }, { op: 'set_battle_rule', rule: 'canLose' });
  const target = { species: quest.species, level: Number(quest.level ?? 0), form: Number(quest.form ?? 0) };
  if (quest.personal_id != null) target.personal_id = Number(quest.personal_id);
  if (Number(quest.gender) < 2) target.gender = Number(quest.gender);
  const battle = { op: 'request_wild_battle', target };
  operations.push(battle);
  if (input.error) {
    state.actions_left = Math.min(Number(input.action_limit ?? 3), Number(state.actions_left ?? 0) + 1);
    operations.push({ op: 'restore_village_action' }, { op: 'log_error', class_name: input.error.class_name, message: input.error.message }, { op: 'message', key: 'battle_start_failed' }, { op: 'clear_battle_rules' });
    return { state, operations, result: false, battle, reward_requested: false };
  }
  if (input.run_end_pending === true) {
    operations.push({ op: 'clear_battle_rules' });
    return { state, operations, result: 'run_end', battle, reward_requested: false };
  }
  const outcome = Number(input.outcome ?? 0);
  let rewardRequested = false;
  if (outcome === 1 || outcome === 4) {
    operations.push({ op: 'quest_complete_feedback' }, { op: 'request_add_money', amount: Number(quest.reward ?? 0) });
    rewardRequested = true;
    operations.push({ op: 'message', key: outcome === 4 ? 'bounty_captured' : 'bounty_defeated', money_gained: Number(input.money_gained ?? quest.reward ?? 0) });
  } else if (outcome === 3) operations.push({ op: 'message', key: 'bounty_escaped' });
  else operations.push({ op: 'message', key: 'bounty_ended' });
  state.active_bounty = null;
  operations.push({ op: 'set_active_bounty', value: null }, { op: 'request_save' }, { op: 'clear_battle_rules' });
  return { state, operations, result: outcome, battle, reward_requested: rewardRequested };
}

export function resolveVillageBountyMoneyIntegration(input = {}) {
  const moneyBefore = Number(input.money ?? 0);
  const maxMoney = Number(input.maxMoney ?? 9999999);
  const depart = resolveVillageBountyDepart(input);
  const rewardRequest = depart.operations.find((op) => op.op === 'request_add_money');
  const moneyOperations = [];
  let money = moneyBefore;

  if (rewardRequest) {
    const amount = Number(rewardRequest.amount);
    money = setMoney(money + amount, maxMoney);
    moneyOperations.push(
      { op: 'add_money', amount, result: true },
      { op: 'set_money', before: moneyBefore, after: money },
    );
  }

  return {
    depart,
    state: depart.state,
    result: depart.result,
    money,
    moneyDelta: money - moneyBefore,
    moneyOperations,
    return_target: 'village',
  };
}
