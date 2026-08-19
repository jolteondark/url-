import { commitDeferredBattleSystemsExpRuntime } from "./battle-exp-runtime-integration.js";

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}

function growthPresentation(operation) {
  if (operation?.op === "gain_exp") return { type: "exp_gain", actor: "player", amount: Number(operation.amount ?? 0) };
  if (operation?.op === "level_up") return { type: "level_up", actor: "player", level: Number(operation.level ?? 0) };
  if (operation?.op === "learn_move") return { type: "move_learned", actor: "player", moveId: operation.move, slot: operation.slot };
  if (operation?.op === "replace_move") return { type: "move_replaced", actor: "player", moveId: operation.move, forgottenMoveId: operation.forgotten, slot: operation.slot };
  if (operation?.op === "decline_move") return { type: "move_declined", actor: "player", moveId: operation.move };
  if (operation?.op === "level_evolution") return { type: "evolution", actor: "player", from: operation.from, to: operation.to };
  return null;
}

function scopedOperations(commits, battleTurn) {
  const operations = [];
  for (const commit of commits ?? []) {
    for (const operation of commit.operations ?? []) {
      operations.push({
        ...structuredClone(operation),
        scope: "exp",
        battleTurn,
        roundIndex: Number(commit.roundIndex ?? 0),
        actionIndex: Number(commit.actionIndex ?? 0),
      });
    }
  }
  return operations;
}

export function commitSafariNormalExpRewardGrowth(runtime, result = {}) {
  const state = stateOf(runtime);
  const battle = state.battle;
  if (!battle) return result;
  const deferred = (result?.expIntegration?.commits ?? []).filter((commit) => commit?.deferred === true);
  if (deferred.length === 0) return result;

  const party = Array.isArray(runtime?.player?.party) ? runtime.player.party : [];
  const recipientPartyIndex = Number(result.rewardGrowthRecipientPartyIndex ?? battle.player_party_index ?? 0);
  const pokemon = party[recipientPartyIndex];
  if (!pokemon) throw new RangeError(`EXP recipient party index is unavailable: ${recipientPartyIndex}`);

  const committed = commitDeferredBattleSystemsExpRuntime({ deferredCommits: deferred, pokemon });
  party[recipientPartyIndex] = structuredClone(committed.pokemon);

  const gained = committed.commits.reduce((sum, commit) => sum + Number(commit.expGained ?? 0), 0);
  if (battle.kind === "trainer" && Number(battle.decision) === 0) {
    battle.trainer_exp_gained = Number(battle.trainer_exp_gained ?? 0) + gained;
    battle.exp_gained = 0;
  } else {
    battle.exp_gained = gained;
  }

  const operations = scopedOperations(committed.commits, Number(battle.turn ?? 1) - 1);
  const presentation = operations.map(growthPresentation).filter(Boolean);
  battle.last_operations = [...(battle.last_operations ?? result.operations ?? []), ...operations];
  battle.presentation = [...(battle.presentation ?? result.presentation ?? []), ...presentation];
  state.last_operations = [...battle.last_operations];

  result.expIntegration = { pokemon: structuredClone(committed.pokemon), commits: structuredClone(committed.commits) };
  result.operations = [...battle.last_operations];
  result.presentation = [...battle.presentation];
  result.rewardGrowthRecipientPartyIndex = recipientPartyIndex;
  return result;
}
