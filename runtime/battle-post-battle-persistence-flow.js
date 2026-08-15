import { applyPostBattleReflection } from "./pokemon-post-battle-reflection.js";

function clone(value) { return structuredClone(value); }
function sameStolenData(data, item, side, idxParty) {
  return Array.isArray(data) && data.length >= 3 && data[0] === item && data[1] === side && data[2] === idxParty;
}

export function resolvePostBattlePersistence(input = {}) {
  const party = clone(input.party || []);
  const caught = clone(input.caught || []);
  const initialItems = clone(input.initialItems || [[], []]);
  const stolenItems = clone(input.stolenItems || [[], []]);
  const caughtPartyIndicies = [...(input.caughtPartyIndicies || [])];
  const operations = [];
  const restore = input.restoreItemsAfterBattle === true && input.safari !== true;

  if (restore) {
    for (let i = 0; i < caught.length; i += 1) {
      const pkmn = caught[i];
      if (!pkmn) continue;
      const idxParty = caughtPartyIndicies[i];
      const initialItem = initialItems?.[1]?.[idxParty] ?? null;
      pkmn.item = initialItem;
      operations.push({ op: "restore_caught_initial_item", caughtIndex: i, idxParty, item: initialItem });
      for (let j = 0; j < (stolenItems?.[0]?.length || 0); j += 1) {
        if (sameStolenData(stolenItems[0][j], initialItem, 1, idxParty)) {
          stolenItems[0][j] = [];
          operations.push({ op: "clear_party_stolen_match", partyIndex: j, caughtIndex: i });
          break;
        }
      }
    }
    caughtPartyIndicies.length = 0;
    for (let i = 0; i < party.length; i += 1) {
      const pkmn = party[i];
      if (!pkmn) continue;
      const initialItem = initialItems?.[0]?.[i] ?? null;
      pkmn.item = initialItem;
      operations.push({ op: "restore_party_initial_item", partyIndex: i, item: initialItem });
      const stolen = stolenItems?.[0]?.[i];
      if (!Array.isArray(stolen) || stolen.length === 0) continue;
      if (stolen[1] === 1) operations.push({ op: "bag_add_request", item: stolen[0], source: "enemy_stolen_item", partyIndex: i });
      stolenItems[0][i] = [];
      operations.push({ op: "clear_party_stolen_data", partyIndex: i });
    }
  }

  operations.push({ op: "caught_store_handoff" });

  const reflectionEvents = input.reflectionEvents || [];
  for (let i = 0; i < party.length; i += 1) {
    const pkmn = party[i];
    if (!pkmn) continue;
    const event = reflectionEvents[i];
    if (event) {
      const reflected = applyPostBattleReflection(pkmn, { ...event, end_battle: true });
      party[i] = reflected.runtime;
      operations.push(...reflected.operations.map((x) => ({ ...x, partyIndex: i })));
      operations.push({ op: "post_battle_runtime_reflection", partyIndex: i });
    }
    const initialItem = initialItems?.[0]?.[i] ?? null;
    party[i].item = initialItem;
    operations.push({ op: "final_party_item_reflection", partyIndex: i, item: initialItem });
  }

  return { party, caught, stolenItems, caughtPartyIndicies, operations };
}

