import { commitBattleSystemsExpRuntime } from "./battle-exp-runtime-integration.js";
import { ensureSafariGeneralData } from "./safari-general-data-demand.js";
import { maximumExpForGrowthRate } from "./pokemon-growth-rate.js";
import { SAFARI_MOVE_MASTERS, SAFARI_NATURE_MASTERS, SAFARI_SPECIES_MASTERS } from "./safari-playable-data.js";

function asNonNegativeInteger(value, field) {
  const amount = Number(value);
  if (!Number.isInteger(amount) || amount < 0) throw new TypeError(`${field} must be a non-negative integer`);
  return amount;
}

function isEggPokemon(pokemon) {
  return pokemon?.egg === true || Number(pokemon?.steps_to_hatch ?? 0) > 0;
}

function levelMovesByLevel(speciesMaster) {
  if (!Array.isArray(speciesMaster?.level_moves)) {
    throw new Error(`missing canonical level-up moves for ${speciesMaster?.id ?? "unknown species"}`);
  }
  const byLevel = Object.create(null);
  for (const entry of speciesMaster.level_moves) {
    const level = Number(entry?.level);
    const move = String(entry?.move ?? "");
    if (!Number.isInteger(level) || level < 1 || level > 100 || !move) continue;
    (byLevel[level] ??= []).push(move);
  }
  return Object.freeze(Object.fromEntries(
    Object.entries(byLevel).map(([level, moves]) => [level, Object.freeze([...moves])]),
  ));
}

function explicitMoveDecisions(pokemon) {
  const decisions = pokemon?.__battle_move_decisions;
  if (!decisions || typeof decisions !== "object" || Array.isArray(decisions)) return Object.freeze({});
  return Object.freeze(structuredClone(decisions));
}

async function ensureGrowthMaster(pokemon) {
  let speciesMaster = SAFARI_SPECIES_MASTERS[pokemon?.species];
  if (!Array.isArray(speciesMaster?.level_moves)) {
    await ensureSafariGeneralData();
    speciesMaster = SAFARI_SPECIES_MASTERS[pokemon?.species];
  }
  if (!speciesMaster?.growth_rate || !Array.isArray(speciesMaster?.level_moves)) {
    throw new RangeError(`normal-event EXP species is outside the Safari growth projection: ${pokemon?.species}`);
  }
  return speciesMaster;
}

async function fixedExpInput(runtime, pokemon, amount) {
  const speciesMaster = await ensureGrowthMaster(pokemon);
  const natureId = pokemon.nature_for_stats_id ?? pokemon.nature_id ?? "HARDY";
  const natureMaster = SAFARI_NATURE_MASTERS[natureId];
  if (!natureMaster) throw new RangeError(`normal-event EXP nature is outside the Safari projection: ${natureId}`);

  const growthRate = String(speciesMaster.growth_rate);
  return {
    growthRate,
    maximumExp: maximumExpForGrowthRate(growthRate),
    maxMoves: 4,
    // Reuse the canonical EXP flow's exact post-formula override. The synthetic
    // base calculation is intentionally minimal and has no Battle/trainer bonuses;
    // itemModifiedExp becomes the exact normal-event award before growth commits.
    expContext: {
      defeatedLevel: 1,
      baseExp: 7,
      numParticipants: 1,
      expShareCount: 0,
      participant: true,
      hasExpShare: false,
      expAll: false,
      splitExpBetweenGainers: true,
      moreExpFromTrainerPokemon: false,
      trainerBattle: false,
      scaledExpFormula: false,
      outsiderMultiplier: 1,
      expCharm: false,
      itemModifiedExp: amount,
      affectionBoost: false,
    },
    movesByLevel: levelMovesByLevel(speciesMaster),
    moveDecisions: explicitMoveDecisions(pokemon),
    moveDecisionResolverSource: "safari_browser",
    runtimeMasters: {
      species_master: speciesMaster,
      nature_master: natureMaster,
      move_masters: SAFARI_MOVE_MASTERS,
    },
    evolutionMasters: {
      species_masters: SAFARI_SPECIES_MASTERS,
      nature_master: natureMaster,
      move_masters: SAFARI_MOVE_MASTERS,
      party: runtime?.player?.party ?? [],
    },
    deferEvolution: false,
  };
}

async function commitFixedExp(runtime, pokemon, amount) {
  const battleExpInput = await fixedExpInput(runtime, pokemon, amount);
  const committed = commitBattleSystemsExpRuntime({
    pokemon,
    battleInput: {
      rounds: [{ actions: [{
        postHitResolution: { operations: [{ op: "gain_exp_request" }] },
        battleExpInput,
      }] }],
    },
    turn: { operations: [{ op: "use_move", round: 1, action: 0 }] },
  });
  const commit = committed.commits[0] ?? null;
  return {
    pokemon: committed.pokemon,
    expGained: Number(commit?.expGained ?? 0),
    commit,
    operations: structuredClone(commit?.operations ?? []),
  };
}

export async function grantSafariNormalEventPokemonExp(runtime, partyIndex, amount) {
  const exp = asNonNegativeInteger(amount, "normal-event EXP amount");
  const party = runtime?.player?.party;
  const index = Number(partyIndex);
  if (!Array.isArray(party)) throw new TypeError("runtime player.party is required");
  if (!Number.isInteger(index) || index < 0 || index >= party.length) throw new RangeError(`normal-event EXP party index is unavailable: ${partyIndex}`);
  const pokemon = party[index];
  if (!pokemon || isEggPokemon(pokemon) || exp === 0) {
    return { runtime, partyIndex: index, skipped: true, expGained: 0, operations: [] };
  }

  const committed = await commitFixedExp(runtime, pokemon, exp);
  party[index] = structuredClone(committed.pokemon);
  return {
    runtime,
    partyIndex: index,
    skipped: false,
    expGained: committed.expGained,
    operations: committed.operations,
    commit: structuredClone(committed.commit),
  };
}

export async function grantSafariNormalEventPartyExp(runtime, amount) {
  const exp = asNonNegativeInteger(amount, "normal-event Party EXP amount");
  const party = runtime?.player?.party;
  if (!Array.isArray(party)) throw new TypeError("runtime player.party is required");

  const recipients = [];
  const operations = [];
  const initialLength = party.length;
  for (let index = 0; index < initialLength; index += 1) {
    const pokemon = party[index];
    if (!pokemon || isEggPokemon(pokemon)) continue;
    const granted = await grantSafariNormalEventPokemonExp(runtime, index, exp);
    recipients.push({ partyIndex: index, expGained: granted.expGained });
    operations.push(...granted.operations.map((operation) => ({
      ...structuredClone(operation),
      scope: "normal_event_exp",
      partyIndex: index,
    })));
  }
  return { runtime, recipients, operations };
}
